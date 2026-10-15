import { AudioDevice } from '../../types';
import { db } from '../db/databaseService';

export class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private micLevel = 0;
  private recognition: any = null;
  private isListeningForWakeWord = false;
  private voiceSessionState: 'idle' | 'listening_wake' | 'capturing_command' | 'speaking' = 'idle';
  private commandSilenceTimer: any = null;
  private commandMaxTimer: any = null;
  private currentCapturedTranscript = '';
  private commandStartResultIndex = 0;
  private wakeWordCallbacks: Array<() => void> = [];
  private commandCapturedCallbacks: Array<(command: string) => void> = [];
  private interimSpeechCallbacks: Array<(text: string) => void> = [];
  private currentWakeWord = 'โบ้';
  private alternateWakeWords: string[] = ['ไอ้โบ้', 'ไอโบ้', 'น้องโบ', 'โบ', 'บักโบ้', 'Bo AI', 'โบไอ'];
  private sensitivity = 75; // 0-100

  private constructor() {
    this.initSpeechRecognition();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  public setWakeWords(primary: string, alternates: string[], sensitivity = 75) {
    this.currentWakeWord = primary.toLowerCase().trim();
    const alts = [...alternates];
    
    // Auto add common Thai phonetic/spelling variants for "โบ้"
    alts.push('โบ', 'โบ้', 'โบว์', 'bo', 'beau', 'ไอ้โบ้', 'น้องโบ้', 'ไอโบ้', 'บักโบ้');
    
    this.alternateWakeWords = Array.from(new Set(alts.map(w => w.toLowerCase().trim()).filter(Boolean)));
    this.sensitivity = sensitivity;

    // Restart recognizer if already listening so new words take effect immediately
    if (this.isListeningForWakeWord && this.recognition) {
      try {
        this.recognition.abort();
      } catch (_) {}
      setTimeout(() => {
        if (this.isListeningForWakeWord) {
          try {
            this.recognition.start();
          } catch (_) {}
        }
      }, 100);
    }
  }

  // Devices
  public async getInputDevices(): Promise<AudioDevice[]> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId || `mic_${idx}`,
          label: d.label || `ไมโครโฟน ${idx + 1} (Default)`,
          kind: 'audioinput',
        }));
    } catch (e) {
      console.warn('Cannot enumerate input devices:', e);
      return [
        { deviceId: 'default', label: 'Default Microphone (Realtek Audio)', kind: 'audioinput' },
        { deviceId: 'mic_headset', label: 'Headset Microphone', kind: 'audioinput' },
      ];
    }
  }

  public async getOutputDevices(): Promise<AudioDevice[]> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audiooutput')
        .map((d, idx) => ({
          deviceId: d.deviceId || `speaker_${idx}`,
          label: d.label || `ลำโพง ${idx + 1} (Default)`,
          kind: 'audiooutput',
        }));
    } catch (e) {
      console.warn('Cannot enumerate output devices:', e);
      return [
        { deviceId: 'default', label: 'Default Speakers (Realtek High Definition)', kind: 'audiooutput' },
        { deviceId: 'headphone_1', label: 'Headphones / Earphones', kind: 'audiooutput' },
      ];
    }
  }

  // Real-time Mic Level Visualizer
  public async startMicrophoneMeter(deviceId?: string): Promise<boolean> {
    try {
      if (this.mediaStream) {
        this.stopMicrophoneMeter();
      }

      const constraints: MediaStreamConstraints = {
        audio: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Scale to 0-100 based on sensitivity factor
        const factor = (this.sensitivity / 50);
        this.micLevel = Math.min(100, Math.round((average / 128) * 100 * factor));

        if (this.mediaStream?.active) {
          requestAnimationFrame(updateMeter);
        }
      };
      requestAnimationFrame(updateMeter);
      return true;
    } catch (e) {
      console.warn('Microphone stream access error (simulate levels for preview):', e);
      // Simulate level fluctuation for mock / sandbox
      const simInterval = setInterval(() => {
        if (!this.analyser) {
          this.micLevel = Math.floor(Math.random() * 35);
        } else {
          clearInterval(simInterval);
        }
      }, 100);
      return false;
    }
  }

  public getMicrophoneLevel(): number {
    return this.micLevel;
  }

  public stopMicrophoneMeter(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.micLevel = 0;
  }

  // Wake Word & Continuous Speech Recognition
  private initSpeechRecognition() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'th-TH';

      this.recognition.onresult = (event: any) => {
        if (!this.isListeningForWakeWord && this.voiceSessionState === 'idle') return;
        if (this.voiceSessionState === 'speaking') return; // Ignore mic while Bo is speaking

        const wordsToMatch = [this.currentWakeWord, ...this.alternateWakeWords]
          .filter(Boolean)
          .sort((a, b) => b.length - a.length); // Longest first to avoid partial prefix collisions

        // STATE 1: Waiting for wake word (e.g. "ไอ้โบ้", "โบ้", "น้องโบ")
        if (this.voiceSessionState === 'listening_wake' || this.voiceSessionState === 'idle') {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const rawPhrase = (event.results[i][0]?.transcript || '').trim();
            if (!rawPhrase) continue;
            const phraseLower = rawPhrase.toLowerCase();

            const matchedWord = wordsToMatch.find(w => phraseLower.includes(w.toLowerCase()));
            if (matchedWord) {
              console.log('[Bo AI Wake Word Heard]:', rawPhrase, '| Matched:', matchedWord);
              this.commandStartResultIndex = i;
              this.voiceSessionState = 'capturing_command';
              this.playChime('wake');
              this.wakeWordCallbacks.forEach(cb => cb());

              // Extract any trailing command spoken in the same breath
              const pos = phraseLower.indexOf(matchedWord.toLowerCase());
              let trailing = '';
              if (pos !== -1) {
                trailing = rawPhrase.slice(pos + matchedWord.length).trim();
              }
              this.currentCapturedTranscript = trailing;
              if (trailing) {
                this.interimSpeechCallbacks.forEach(cb => cb(trailing));
              }

              this.resetSilenceTimer();
              return;
            }
          }
        }
        // STATE 2: Capturing command continuously without stuttering or word repetition
        else if (this.voiceSessionState === 'capturing_command') {
          let fullCommand = '';
          const startIndex = Math.max(0, Math.min(this.commandStartResultIndex, event.results.length - 1));
          for (let i = startIndex; i < event.results.length; i++) {
            const item = event.results[i];
            if (item && item[0]?.transcript) {
              fullCommand += item[0].transcript;
            }
          }

          let cleaned = fullCommand.trim();
          for (const w of wordsToMatch) {
            const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`^${escaped}\\s*`, 'i');
            cleaned = cleaned.replace(regex, '').trim();
          }

          if (cleaned) {
            this.currentCapturedTranscript = cleaned;
            this.interimSpeechCallbacks.forEach(cb => cb(cleaned));
          }

          this.resetSilenceTimer();
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('SpeechRecognition error:', e);
        }
      };

      this.recognition.onend = () => {
        if (this.voiceSessionState === 'capturing_command') {
          // If session ended mid-command, reset start index for next event
          this.commandStartResultIndex = 0;
        }
        if (this.isListeningForWakeWord && this.voiceSessionState !== 'speaking') {
          setTimeout(() => {
            try {
              if (this.isListeningForWakeWord && this.voiceSessionState !== 'speaking') {
                this.recognition.start();
              }
            } catch (_) {}
          }, 150);
        }
      };
    }
  }

  private resetSilenceTimer() {
    if (this.commandSilenceTimer) clearTimeout(this.commandSilenceTimer);
    if (this.commandMaxTimer) clearTimeout(this.commandMaxTimer);

    const hasCommand = this.currentCapturedTranscript.trim().length >= 2;

    if (!hasCommand) {
      // User just triggered wake word, but hasn't spoken their question yet.
      // Give them a generous 7-second window to start talking!
      this.commandMaxTimer = setTimeout(() => {
        if (this.voiceSessionState === 'capturing_command' && !this.currentCapturedTranscript.trim()) {
          console.log('[Bo AI]: No command spoken within 7s, resuming wake listening.');
          this.voiceSessionState = 'listening_wake';
          this.interimSpeechCallbacks.forEach(cb => cb(''));
        }
      }, 7000);
      return; // IMPORTANT: Do NOT arm the silence finalize timer yet!
    }

    // User HAS spoken at least 2 characters of their question:
    // When they pause speaking for 1.4s, finalize and send the command!
    this.commandSilenceTimer = setTimeout(() => {
      if (this.voiceSessionState === 'capturing_command') {
        const finalCommand = this.currentCapturedTranscript.trim();
        if (finalCommand.length >= 2) {
          console.log('[Bo AI Command Captured & Finalized via silence]:', finalCommand);
          this.finalizeCommand(finalCommand);
        } else {
          this.voiceSessionState = 'listening_wake';
          this.interimSpeechCallbacks.forEach(cb => cb(''));
        }
      }
    }, 1400);

    // Safety timeout: finalize after 12s even if continuous background noise prevents silence
    this.commandMaxTimer = setTimeout(() => {
      if (this.voiceSessionState === 'capturing_command') {
        const finalCommand = this.currentCapturedTranscript.trim();
        if (finalCommand.length >= 2) {
          console.log('[Bo AI Command Finalized via max duration]:', finalCommand);
          this.finalizeCommand(finalCommand);
        } else {
          this.voiceSessionState = 'listening_wake';
          this.interimSpeechCallbacks.forEach(cb => cb(''));
        }
      }
    }, 12000);
  }

  private finalizeCommand(command: string) {
    if (this.commandSilenceTimer) clearTimeout(this.commandSilenceTimer);
    if (this.commandMaxTimer) clearTimeout(this.commandMaxTimer);
    this.voiceSessionState = 'speaking';
    this.currentCapturedTranscript = '';
    this.commandCapturedCallbacks.forEach(cb => cb(command));
  }

  public startWakeWordDetection() {
    this.isListeningForWakeWord = true;
    this.voiceSessionState = 'listening_wake';
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (_) {}
    }
  }

  public stopWakeWordDetection() {
    this.isListeningForWakeWord = false;
    this.voiceSessionState = 'idle';
    if (this.commandSilenceTimer) clearTimeout(this.commandSilenceTimer);
    if (this.commandMaxTimer) clearTimeout(this.commandMaxTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  public onWakeWordDetected(callback: () => void) {
    this.wakeWordCallbacks = [callback];
    return () => {
      this.wakeWordCallbacks = this.wakeWordCallbacks.filter(cb => cb !== callback);
    };
  }

  public onCommandCaptured(callback: (command: string) => void) {
    this.commandCapturedCallbacks = [callback];
    return () => {
      this.commandCapturedCallbacks = this.commandCapturedCallbacks.filter(cb => cb !== callback);
    };
  }

  public onInterimSpeech(callback: (text: string) => void) {
    this.interimSpeechCallbacks = [callback];
    return () => {
      this.interimSpeechCallbacks = this.interimSpeechCallbacks.filter(cb => cb !== callback);
    };
  }

  // Trigger manual listening from microphone button
  public startManualVoiceCommand() {
    this.playChime('wake');
    this.voiceSessionState = 'capturing_command';
    this.currentCapturedTranscript = '';
    this.commandStartResultIndex = 0;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_) {}
      setTimeout(() => {
        try {
          if (this.voiceSessionState === 'capturing_command') {
            this.recognition.start();
          }
        } catch (_) {}
      }, 100);
    }
    this.resetSilenceTimer();
  }

  public setSpeakingState(speaking: boolean) {
    if (speaking) {
      this.voiceSessionState = 'speaking';
      if (this.commandSilenceTimer) clearTimeout(this.commandSilenceTimer);
      if (this.commandMaxTimer) clearTimeout(this.commandMaxTimer);
      // Abort mic recognition while Bo is speaking so it doesn't transcribe its own voice
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (_) {}
      }
    } else {
      this.voiceSessionState = 'listening_wake';
      this.currentCapturedTranscript = '';
      this.commandStartResultIndex = 0;
      if (this.isListeningForWakeWord && this.recognition) {
        setTimeout(() => {
          try {
            if (this.isListeningForWakeWord && this.voiceSessionState === 'listening_wake') {
              this.recognition.start();
            }
          } catch (_) {}
        }, 150);
      }
    }
  }

  private currentAudioElement: HTMLAudioElement | null = null;

  // Text-to-Speech (TTS) - Supports Natural Thai Female Voice, OpenAI & Browser Fallback
  public async speak(text: string, rate = 1.0, pitch = 1.0): Promise<void> {
    this.setSpeakingState(true);
    try {
      const settings = db.getSettings();

      // 1. Natural Thai Female Voice (Free, Studio Clarity - Recommended)
      if (settings.tts_engine === 'natural_female' || !settings.tts_engine) {
        try {
          await this.speakWithNaturalFemale(text, rate || settings.tts_rate || 1.0);
          return;
        } catch (err) {
          console.warn('Natural female TTS failed, falling back to browser:', err);
        }
      }

      // 2. OpenAI Natural Voice (If user configured and has credits)
      if (settings.tts_engine === 'openai' && settings.openai_api_key) {
        try {
          await this.speakWithOpenAI(
            text,
            settings.openai_api_key,
            settings.openai_tts_voice || 'nova',
            settings.openai_tts_model || 'tts-1-hd',
            settings.tts_rate
          );
          return;
        } catch (err) {
          console.warn('OpenAI TTS failed, falling back to Natural Female Voice:', err);
          try {
            await this.speakWithNaturalFemale(text, rate || settings.tts_rate || 1.0);
            return;
          } catch (_) {}
        }
      }

      // 3. Browser SpeechSynthesis fallback
      await this.speakWithBrowser(text, rate, pitch);
    } finally {
      this.setSpeakingState(false);
    }
  }

  // Natural Thai Female Voice (Studio Clarity, 100% Free)
  public async speakWithNaturalFemale(text: string, speed = 1.0): Promise<void> {
    this.stopSpeaking();

    // Clean text: strip code blocks, markdown symbols, and emojis for smooth TTS
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'ดูโค้ดบนจอได้เลยนะ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#>-]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) return;

    // Split into natural short chunks (up to 140 chars)
    const chunks: string[] = [];
    const rawSentences = cleanText.split(/([.!?\n]+|\s{2,})/);
    let currentChunk = '';

    for (const part of rawSentences) {
      if (!part.trim()) continue;
      if ((currentChunk + ' ' + part).length > 140) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = part.trim();
      } else {
        currentChunk = currentChunk ? `${currentChunk} ${part.trim()}` : part.trim();
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    if (chunks.length === 0) chunks.push(cleanText.slice(0, 140));

    // Sequential audio playback
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      await new Promise<void>((resolve) => {
        const audio = new Audio(`/api/tts?text=${encodeURIComponent(chunk.trim())}`);
        if (speed && speed !== 1.0) {
          audio.playbackRate = Math.max(0.5, Math.min(2.0, speed));
        }
        this.currentAudioElement = audio;

        audio.onended = () => {
          this.currentAudioElement = null;
          resolve();
        };
        audio.onerror = () => {
          this.currentAudioElement = null;
          resolve();
        };
        audio.play().catch(() => {
          this.currentAudioElement = null;
          resolve();
        });
      });
    }
  }

  // OpenAI TTS API (tts-1 / tts-1-hd) with realistic voices (nova, shimmer, alloy, etc.)
  public async speakWithOpenAI(
    text: string,
    apiKey: string,
    voice: string = 'nova',
    model: string = 'tts-1-hd',
    speed: number = 1.0
  ): Promise<void> {
    this.stopSpeaking();

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'tts-1-hd',
        input: text,
        voice: voice || 'nova',
        speed: Math.max(0.25, Math.min(4.0, speed || 1.0)),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    this.currentAudioElement = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudioElement = null;
        resolve();
      };
      audio.onerror = (e) => {
        console.warn('OpenAI audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        this.currentAudioElement = null;
        resolve();
      };
      audio.play().catch((e) => {
        console.warn('Audio play error:', e);
        resolve();
      });
    });
  }

  // Browser SpeechSynthesis
  public speakWithBrowser(text: string, rate = 1.0, pitch = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported');
        setTimeout(resolve, 1500);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Select Thai voice if available
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(v => v.lang.includes('th') || v.name.toLowerCase().includes('thai'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('TTS error:', e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Play audio chimes (Web Audio API synthesizers)
  public playChime(type: 'wake' | 'success' | 'alert' | 'test') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'wake') {
        // High harmonic double ding
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'test') {
        // Smooth chord chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
        osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }
}

export const audioService = AudioService.getInstance();
