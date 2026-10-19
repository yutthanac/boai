import { create } from 'zustand';
import { AssistantState, ChatMessage, Conversation } from '../types';
import { db } from '../services/db/databaseService';
import { aiService } from '../services/ai/aiService';
import { audioService } from '../services/audio/audioService';
import { DEFAULT_MUSIC_PLAYLIST } from '../services/music/musicService';

interface AssistantStore {
  state: AssistantState;
  activeTab: 'home' | 'conversation' | 'voice' | 'training' | 'memory' | 'tools' | 'settings';
  activeConversationId: string;
  conversations: Conversation[];
  messages: ChatMessage[];
  isAlwaysListening: boolean;
  isMuted: boolean;
  statusText: string;
  isMiniMode: boolean;
  musicTrack: import('../types').MusicTrackState | null;
  musicVolume: number;
  isMusicMuted: boolean;
  musicPlaylist: import('../types').PlaylistItem[];
  currentPlaylistIndex: number;
  pendingMemoryAction: import('../types').MemoryPendingAction | null;
  theme: 'dark' | 'light';
  grokQuota: import('../types').ProviderQuotaInfo | null;

  // Actions
  setState: (state: AssistantState) => void;
  setActiveTab: (tab: AssistantStore['activeTab']) => void;
  setStatusText: (text: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setGrokQuota: (info: import('../types').ProviderQuotaInfo | null) => void;
  toggleAlwaysListening: () => void;
  toggleMute: () => void;
  loadInitialData: () => void;
  sendMessage: (text: string) => Promise<void>;
  startVoiceInteraction: () => Promise<void>;
  interruptSpeaking: () => Promise<void>;
  clearConversation: () => void;
  selectConversation: (id: string) => void;
  setMiniMode: (enable: boolean) => Promise<void>;
  toggleMiniMode: () => Promise<void>;
  toggleMusicPlayPause: () => void;
  stopMusic: () => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  setMusicVolume: (volume: number) => void;
  adjustMusicVolume: (delta: number) => number;
  setMusicMuted: (muted: boolean) => void;
  skipNextMusic: () => void;
  playPlaylistItem: (index: number) => void;
  addPlaylistItem: (item: Omit<import('../types').PlaylistItem, 'id'>) => void;
  updatePlaylistItem: (id: string, updates: Partial<import('../types').PlaylistItem>) => void;
  deletePlaylistItem: (id: string) => void;
  resetPlaylistToDefault: () => void;
  resolvePendingMemory: (action: 'confirm' | 'dismiss' | 'edit', editedFact?: string) => void;
}

let isAudioListenersBound = false;
let lastSentMessageContent = '';
let lastSentMessageTimestamp = 0;

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  state: 'idle',
  activeTab: 'home',
  activeConversationId: 'conv_default',
  conversations: [],
  messages: [],
  isAlwaysListening: true,
  isMuted: false,
  statusText: 'พร้อมรับฟังคำสั่ง (เรียก "โนอา")',
  isMiniMode: false,
  musicTrack: null,
  musicVolume: (() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('boai_music_volume') : null;
    return saved ? parseFloat(saved) : 0.8;
  })(),
  isMusicMuted: false,
  musicPlaylist: db.getPlaylist(),
  currentPlaylistIndex: 0,
  pendingMemoryAction: null,
  theme: (typeof window !== 'undefined' && localStorage.getItem('bo_theme') === 'light') ? 'light' : 'dark',
  grokQuota: null,

  setState: (state) => set({ state }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setStatusText: (statusText) => set({ statusText }),
  setGrokQuota: (grokQuota) => set({ grokQuota }),

  setTheme: (theme: 'dark' | 'light') => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('bo_theme', theme);
      document.documentElement.classList.toggle('light', theme === 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.setAttribute('data-theme', theme);
    }
    const settings = db.getSettings();
    settings.theme = theme;
    db.saveSettings(settings);
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  setMiniMode: async (enable: boolean) => {
    set({ isMiniMode: enable });
    if (window.electronAPI?.setMiniMode) {
      await window.electronAPI.setMiniMode(enable);
    }
  },

  toggleMiniMode: async () => {
    const next = !get().isMiniMode;
    await get().setMiniMode(next);
  },

  toggleMusicPlayPause: () => {
    const track = get().musicTrack;
    if (!track) return;
    const nextState = !track.isPlaying;
    set({
      musicTrack: { ...track, isPlaying: nextState, updatedAt: new Date().toISOString() },
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('boai-music-action', { detail: { action: nextState ? 'play' : 'pause' } })
      );
    }
    if (window.electronAPI?.sendMediaCommand) {
      window.electronAPI.sendMediaCommand(nextState ? 'play' : 'pause');
    }
  },

  stopMusic: () => {
    set({ musicTrack: null });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boai-music-action', { detail: { action: 'stop' } }));
    }
    if (window.electronAPI?.sendMediaCommand) {
      window.electronAPI.sendMediaCommand('stop');
    }
  },

  pauseMusic: () => {
    const track = get().musicTrack;
    if (!track) return;
    set({
      musicTrack: { ...track, isPlaying: false, updatedAt: new Date().toISOString() },
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boai-music-action', { detail: { action: 'pause' } }));
    }
    if (window.electronAPI?.sendMediaCommand) {
      window.electronAPI.sendMediaCommand('pause');
    }
  },

  resumeMusic: () => {
    const track = get().musicTrack;
    if (!track) {
      // If no track was loaded (e.g. stopped previously), start playing playlist item
      get().playPlaylistItem(get().currentPlaylistIndex || 0);
      return;
    }
    set({
      musicTrack: { ...track, isPlaying: true, updatedAt: new Date().toISOString() },
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boai-music-action', { detail: { action: 'play' } }));
    }
    if (window.electronAPI?.sendMediaCommand) {
      window.electronAPI.sendMediaCommand('play');
    }
  },

  setMusicVolume: (volume: number) => {
    const bounded = Math.max(0, Math.min(1, volume));
    set({ musicVolume: bounded });
    if (typeof window !== 'undefined') {
      localStorage.setItem('boai_music_volume', bounded.toString());
      window.dispatchEvent(
        new CustomEvent('boai-music-volume', { detail: { volume: bounded, isMuted: false } })
      );
    }
  },

  adjustMusicVolume: (delta: number): number => {
    const current = get().musicVolume;
    const next = Math.max(0, Math.min(1, Math.round((current + delta) * 100) / 100));
    get().setMusicVolume(next);
    return Math.round(next * 100);
  },

  setMusicMuted: (muted: boolean) => {
    set({ isMusicMuted: muted });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('boai-music-volume', { detail: { isMuted: muted } })
      );
    }
  },

  playPlaylistItem: (index: number) => {
    const playlist = get().musicPlaylist;
    if (index < 0 || index >= playlist.length) return;
    const item = playlist[index];
    set({
      currentPlaylistIndex: index,
      musicTrack: {
        title: item.title,
        artist: item.artist,
        isPlaying: true,
        videoId: item.videoId,
        embedUrl: item.videoId
          ? `https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&enablejsapi=1`
          : undefined,
        audioStreamUrl: item.audioStreamUrl,
        playbackMode: item.playbackMode,
        url: item.videoId
          ? `https://www.youtube.com/watch?v=${item.videoId}`
          : `https://music.youtube.com/search?q=${encodeURIComponent(item.title)}`,
        source: item.playbackMode === 'stream' ? 'direct_stream' : 'youtube_music',
        updatedAt: new Date().toISOString(),
      },
    });
  },

  skipNextMusic: () => {
    const playlist = get().musicPlaylist;
    const currentIndex = get().currentPlaylistIndex;
    const nextIndex = (currentIndex + 1) % playlist.length;
    get().playPlaylistItem(nextIndex);
    if (window.electronAPI?.sendMediaCommand) {
      window.electronAPI.sendMediaCommand('next');
    }
  },

  addPlaylistItem: (item) => {
    db.addPlaylistItem(item);
    set({ musicPlaylist: db.getPlaylist() });
  },

  updatePlaylistItem: (id, updates) => {
    db.updatePlaylistItem(id, updates);
    set({ musicPlaylist: db.getPlaylist() });
  },

  deletePlaylistItem: (id) => {
    db.deletePlaylistItem(id);
    set({ musicPlaylist: db.getPlaylist() });
  },

  resetPlaylistToDefault: () => {
    const list = db.resetPlaylist();
    set({ musicPlaylist: list, currentPlaylistIndex: 0 });
  },

  resolvePendingMemory: (action, editedFact) => {
    const pending = get().pendingMemoryAction;
    if (!pending) return;

    if (action === 'confirm' || action === 'edit') {
      const factToSave = editedFact || pending.fact;
      if (pending.type === 'conflict' && pending.existing_memory_id) {
        db.deleteMemory(pending.existing_memory_id);
        db.addMemory(factToSave, pending.category, 4, 95, true);
        db.logMemoryAudit(
          'conflicted',
          `แก้ไขข้อมูลขัดแย้ง: แทนที่ "${pending.existing_content?.slice(0, 30)}..." ด้วย "${factToSave.slice(0, 30)}..."`,
          pending.existing_memory_id
        );
      } else {
        db.addMemory(factToSave, pending.category, 3, 90, true);
      }
    } else {
      db.logMemoryAudit('deleted', `ผู้ใช้ยกเลิกการบันทึกข้อเท็จจริง: "${pending.fact.slice(0, 30)}..."`);
    }

    set({ pendingMemoryAction: null });
  },

  toggleAlwaysListening: () => {
    const next = !get().isAlwaysListening;
    set({ isAlwaysListening: next });
    const settings = db.getSettings();
    settings.always_listening = next;
    db.saveSettings(settings);

    if (next) {
      audioService.startWakeWordDetection();
      set({ statusText: 'เปิดโหมด Always Listening แล้ว (เรียก "โนอา")' });
    } else {
      audioService.stopWakeWordDetection();
      set({ statusText: 'ปิดโหมด Always Listening แล้ว' });
    }
  },

  toggleMute: () => {
    const next = !get().isMuted;
    set({ isMuted: next });
    if (next) {
      audioService.stopWakeWordDetection();
      audioService.stopSpeaking();
      set({ statusText: 'ปิดเสียง/ไมค์ชั่วคราว (Muted)' });
    } else {
      if (get().isAlwaysListening) {
        audioService.startWakeWordDetection();
      }
      set({ statusText: 'เปิดเสียง/ไมค์แล้ว พร้อมทำงาน' });
    }
  },

  loadInitialData: () => {
    const convs = db.getConversations();
    const activeId = convs.length > 0 ? convs[0].id : 'conv_default';
    const msgs = db.getMessages(activeId);
    const settings = db.getSettings();

    set({
      conversations: convs,
      activeConversationId: activeId,
      messages: msgs,
      isAlwaysListening: settings.always_listening,
    });

    // Initialize Theme
    const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('bo_theme') as 'dark' | 'light') || settings.theme || 'dark';
    get().setTheme(savedTheme);

    // Configure Wake Word
    audioService.setWakeWords(settings.wake_word, settings.alternate_names, settings.sensitivity);

    // Register Audio & Electron Listeners once
    if (!isAudioListenersBound) {
      isAudioListenersBound = true;

      if (typeof window !== 'undefined') {
        window.addEventListener('boai-quota-update', ((e: CustomEvent) => {
          if (e.detail) {
            get().setGrokQuota(e.detail);
          }
        }) as EventListener);
      }

      // Register Wake Word trigger
      audioService.onWakeWordDetected(() => {
        if (!get().isMuted) {
          if (get().state === 'speaking') {
            audioService.stopSpeaking();
          }
          set({
            state: 'listening',
            statusText: 'กำลังฟังอยู่จ้า... (พูดได้เลยนะ)',
          });
        }
      });

      // Register Command Captured
      audioService.onCommandCaptured(async (command: string) => {
        if (!get().isMuted) {
          await get().sendMessage(command);
        }
      });

      // Register Interim Speech
      audioService.onInterimSpeech((text: string) => {
        if (text) {
          set({
            statusText: `ได้ยินว่า: "${text}"...`,
          });
        } else {
          const currentSettings = db.getSettings();
          set({
            state: 'idle',
            statusText: currentSettings.always_listening ? 'พร้อมรับฟัง (เรียก "โนอา")' : 'สแตนด์บาย',
          });
        }
      });

      // Electron listeners
      if (window.electronAPI) {
        window.electronAPI.onMiniModeChanged((isMini) => {
          set({ isMiniMode: isMini });
        });

        window.electronAPI.onToggleMiniModeTrigger(() => {
          get().toggleMiniMode();
        });

        window.electronAPI.onToggleMuteFromTray(() => {
          get().toggleMute();
        });

        window.electronAPI.onMediaCommandReceived((command) => {
          if (command === 'play' || command === 'pause') {
            get().toggleMusicPlayPause();
          } else if (command === 'next') {
            get().skipNextMusic();
          }
        });
      }

      // Web custom event for music state
      window.addEventListener('boai-music-state', ((event: CustomEvent) => {
        if (event.detail) {
          set({ musicTrack: event.detail });
        }
      }) as EventListener);

      // Web custom event for music control commands
      window.addEventListener('boai-music-control', ((event: CustomEvent) => {
        const action = event.detail?.action;
        if (action === 'stop') get().stopMusic();
        else if (action === 'pause') get().pauseMusic();
        else if (action === 'resume') get().resumeMusic();
        else if (action === 'next') get().skipNextMusic();
        else if (action === 'volume_substantial_decrease') get().setMusicVolume(0.20);
        else if (action === 'volume_low') get().setMusicVolume(0.10);
        else if (action === 'volume_decrease') get().adjustMusicVolume(-0.10);
        else if (action === 'volume_increase') get().adjustMusicVolume(0.10);
        else if (action === 'mute') get().setMusicMuted(true);
        else if (action === 'unmute') get().setMusicMuted(false);
      }) as EventListener);

      // Web custom event for playlist updates
      window.addEventListener('boai-playlist-updated', ((event: CustomEvent) => {
        if (event.detail && Array.isArray(event.detail)) {
          set({ musicPlaylist: event.detail });
        }
      }) as EventListener);
    }

    if (settings.always_listening) {
      audioService.startWakeWordDetection();
    }
  },

  selectConversation: (id: string) => {
    const msgs = db.getMessages(id);
    set({ activeConversationId: id, messages: msgs });
  },

  clearConversation: () => {
    const { activeConversationId } = get();
    db.clearMessages(activeConversationId);
    set({ messages: [], pendingMemoryAction: null });
  },

  sendMessage: async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    // Prevent duplicate submission within 1.5 seconds
    const now = Date.now();
    if (cleanText.toLowerCase() === lastSentMessageContent.toLowerCase() && (now - lastSentMessageTimestamp < 1500)) {
      console.warn('[Bo AI]: Duplicate message blocked within 1.5s:', cleanText);
      return;
    }
    lastSentMessageContent = cleanText;
    lastSentMessageTimestamp = now;

    const { activeConversationId } = get();

    // 1. Fact / Conflict Detection (Roadmap 4 & 5)
    const pendingMemory = aiService.detectPendingMemoryAction(cleanText);
    if (pendingMemory) {
      set({ pendingMemoryAction: pendingMemory });
    }

    // 2. Add User Message
    const userMsg = db.addMessage(activeConversationId, 'user', cleanText);
    if (pendingMemory) {
      userMsg.pending_memory = pendingMemory;
    }

    const currentMsgs = [...get().messages, userMsg];
    set({
      messages: currentMsgs,
      state: 'thinking',
      statusText: 'กำลังคิดแป๊บนึงนะ...',
    });

    // 3. Fetch AI Response
    try {
      const chatResp = await aiService.chatDetailed(currentMsgs);
      const replyText = chatResp.content;
      const assistantMsg = db.addMessage(
        activeConversationId,
        'assistant',
        replyText,
        chatResp.training_source,
        chatResp.training_label
      );

      set({
        messages: [...currentMsgs, assistantMsg],
        state: 'speaking',
        statusText: 'กำลังตอบกลับ...',
      });

      // If in mini mode, show Windows notification
      if (get().isMiniMode && window.electronAPI?.showNotification) {
        window.electronAPI.showNotification('โนอา (Noar AI)', replyText.slice(0, 100));
      }

      // 4. Text to Speech
      const settings = db.getSettings();
      await audioService.speak(replyText, settings.tts_rate, settings.tts_pitch);
    } catch (e: any) {
      const errMsg = db.addMessage(activeConversationId, 'assistant', 'ขออภัยค่ะ เกิดข้อผิดพลาดชั่วคราว ลองถามใหม่อีกครั้งนะคะ');
      set({ messages: [...currentMsgs, errMsg] });
    } finally {
      const settings = db.getSettings();
      set({
        state: 'idle',
        statusText: settings.always_listening ? 'พร้อมรับฟัง (เรียก "โนอา")' : 'สแตนด์บาย',
      });
    }
  },

  startVoiceInteraction: async () => {
    // If Noah is currently speaking, stop speaking immediately and switch to listening
    if (get().state === 'speaking') {
      audioService.stopSpeaking();
    }

    set({
      state: 'listening',
      statusText: 'กำลังฟังอยู่จ้า... (พูดได้เลยนะ)',
    });
    audioService.startManualVoiceCommand();
  },

  interruptSpeaking: async () => {
    if (get().state === 'speaking') {
      audioService.stopSpeaking();
      audioService.setSpeakingState(false);
      set({
        state: 'listening',
        statusText: 'กำลังฟังอยู่จ้า... (พูดได้เลยนะ)',
      });
      audioService.startManualVoiceCommand();
    }
  },
}));
