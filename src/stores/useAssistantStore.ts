import { create } from 'zustand';
import { AssistantState, ChatMessage, Conversation } from '../types';
import { db } from '../services/db/databaseService';
import { aiService } from '../services/ai/aiService';
import { audioService } from '../services/audio/audioService';

interface AssistantStore {
  state: AssistantState;
  activeTab: 'home' | 'conversation' | 'voice' | 'training' | 'memory' | 'tools' | 'settings';
  activeConversationId: string;
  conversations: Conversation[];
  messages: ChatMessage[];
  isAlwaysListening: boolean;
  isMuted: boolean;
  statusText: string;

  // Actions
  setState: (state: AssistantState) => void;
  setActiveTab: (tab: AssistantStore['activeTab']) => void;
  setStatusText: (text: string) => void;
  toggleAlwaysListening: () => void;
  toggleMute: () => void;
  loadInitialData: () => void;
  sendMessage: (text: string) => Promise<void>;
  startVoiceInteraction: () => Promise<void>;
  clearConversation: () => void;
  selectConversation: (id: string) => void;
}

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  state: 'idle',
  activeTab: 'home',
  activeConversationId: 'conv_default',
  conversations: [],
  messages: [],
  isAlwaysListening: true,
  isMuted: false,
  statusText: 'พร้อมรับฟังคำสั่ง (เรียก "น้องโบ")',

  setState: (state) => set({ state }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setStatusText: (statusText) => set({ statusText }),

  toggleAlwaysListening: () => {
    const next = !get().isAlwaysListening;
    set({ isAlwaysListening: next });
    const settings = db.getSettings();
    settings.always_listening = next;
    db.saveSettings(settings);

    if (next) {
      audioService.startWakeWordDetection();
      set({ statusText: 'เปิดโหมด Always Listening แล้ว (เรียก "น้องโบ")' });
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

    // Configure Wake Word
    audioService.setWakeWords(settings.wake_word, settings.alternate_names, settings.sensitivity);

    // Register Wake Word trigger
    audioService.onWakeWordDetected(() => {
      if (!get().isMuted && get().state === 'idle') {
        get().startVoiceInteraction();
      }
    });

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
    set({ messages: [] });
  },

  sendMessage: async (text: string) => {
    if (!text.trim()) return;
    const { activeConversationId } = get();

    // 1. Add User Message
    const userMsg = db.addMessage(activeConversationId, 'user', text);
    const currentMsgs = [...get().messages, userMsg];
    set({
      messages: currentMsgs,
      state: 'thinking',
      statusText: 'กำลังประมวลผลคำตอบ...',
    });

    // 2. Fetch AI Response
    try {
      const replyText = await aiService.chat(currentMsgs);
      const assistantMsg = db.addMessage(activeConversationId, 'assistant', replyText);

      set({
        messages: [...currentMsgs, assistantMsg],
        state: 'speaking',
        statusText: 'กำลังพูดตอบกลับ...',
      });

      // 3. Text to Speech
      const settings = db.getSettings();
      await audioService.speak(replyText, settings.tts_rate, settings.tts_pitch);
    } catch (e: any) {
      const errMsg = db.addMessage(activeConversationId, 'assistant', 'เกิดข้อผิดพลาดในการประมวลผลค่ะ');
      set({ messages: [...currentMsgs, errMsg] });
    } finally {
      set({
        state: 'idle',
        statusText: get().isAlwaysListening ? 'พร้อมรับฟัง (เรียก "น้องโบ")' : 'สแตนด์บาย',
      });
    }
  },

  startVoiceInteraction: async () => {
    if (get().state !== 'idle') return;

    set({
      state: 'listening',
      statusText: 'กำลังฟังคำสั่งของคุณ... (พูดได้เลยค่ะ)',
    });

    try {
      const commandText = await audioService.listenForCommand();
      if (!commandText) {
        set({
          state: 'idle',
          statusText: 'ไม่พบเสียงคำสั่ง กลับสู่โหมดพร้อมรับฟัง',
        });
        return;
      }

      await get().sendMessage(commandText);
    } catch (e) {
      console.warn('Voice interaction error:', e);
      set({
        state: 'idle',
        statusText: 'กลับสู่โหมดพร้อมรับฟัง',
      });
    }
  },
}));
