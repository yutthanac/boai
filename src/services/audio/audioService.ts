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
  private preAmpStream: MediaStream | null = null;

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
    
    // Auto add comprehensive natural Thai greetings, tone variants, and phonetic forms
    alts.push(
      'โบ', 'โบ้', 'โบว์', 'โบ้ะ', 'โบบ',
      'ไอ้โบ้', 'ไอโบ้', 'ไอ้โบ', 'ไอโบ',
      'น้องโบ้', 'น้องโบ',
      'พี่โบ้', 'พี่โบ',
      'น้าโบ้', 'น้าโบ',
      'บักโบ้', 'บักโบ',
      'คุณโบ้', 'คุณโบ',
      'เจ้าโบ้', 'เจ้าโบ',
      'เฮ้ยโบ้', 'เฮ้ยโบ', 'เฮ้โบ้', 'เฮ้โบ',
      'ฮัลโหลโบ้', 'ฮัลโหลโบ',
      'โบ้ครับ', 'โบ้ค่ะ', 'โบ้คะ', 'โบ้จ๋า', 'โบ้เอ้ย', 'โบ้เอย',
      'โบวี่', 'โบตั๋น',
      'bo', 'beau', 'bow', 'bobo', 'boy', 'boe', 'boo',
      'hey bo', 'hi bo', 'hello bo', 'ok bo', 'yo bo'
    );
    
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

  // Strip Thai tone marks (mai ek, mai tho, mai tri, mai chattawa, garan) for normalized soft-voice matching
  public stripThaiToneMarks(text: string): string {
    return text.replace(/[\u0E48-\u0E4E]/g, '');
  }

  // Smart soft-voice wake word matching with acoustic confusion tolerance
  public checkWakeWordMatch(rawPhrase: string): { matched: boolean; matchedWord: string } {
    if (!rawPhrase || !rawPhrase.trim()) return { matched: false, matchedWord: '' };
    const raw = rawPhrase.trim().toLowerCase();
    const stripped = this.stripThaiToneMarks(raw);

    // Guard against common Thai non-name words starting with โ-บ- (e.g. โบราณ, โบสถ์, โบกมือ)
    const nonWakeWordsRegex = /(?:โบราณ|โบสถ์|โบกมือ|โบก|โบรก|โบว์ลิ่ง)/i;
    if (nonWakeWordsRegex.test(raw) && !raw.includes('ไอ้โบ้') && !raw.includes('น้องโบ') && !raw.includes('บักโบ้') && !raw.includes('พี่โบ้')) {
      return { matched: false, matchedWord: '' };
    }

    const wordsToMatch = [this.currentWakeWord, ...this.alternateWakeWords]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    // 1. Direct match on full transcript and tone-stripped transcript
    for (const w of wordsToMatch) {
      const wLower = w.toLowerCase();
      if (raw.includes(wLower)) {
        if (wLower === 'โบ' && /(?:โบราณ|โบสถ์|โบก)/i.test(raw)) continue;
        return { matched: true, matchedWord: w };
      }
      const wStripped = this.stripThaiToneMarks(wLower);
      if (stripped.includes(wStripped)) {
        if (wStripped === 'โบ' && /(?:โบราณ|โบสถ์|โบก)/i.test(stripped)) continue;
        return { matched: true, matchedWord: w };
      }
    }

    // 2. High sensitivity regex matching (sensitivity >= 50)
    if (this.sensitivity >= 50) {
      const conversationalBoRegex = /(?:ไอ้|ไอ|น้อง|พี่|น้า|บัก|คุณ|เฮ้ย|เฮ้|ฮัลโหล|เจ้า|ฮัลโล)?\s*(?:โ[บพ][้่๊๋์]?|โบว์|โบวี่|โบตั๋น|bo|beau|bow|bobo|boy|boe|boo)(?:$|\s|[ครับ|ค่ะ|จ้า|จ๋า|แก|นะ|วะ|โว้ย|เปิด|ปิด|ช่วย|กี่โมง|สภาพอากาศ|เพลง|ทำอะไร|ฟัง|หน่อย|วัน|ตอน])/i;
      if (conversationalBoRegex.test(raw) || conversationalBoRegex.test(stripped)) {
        const match = raw.match(conversationalBoRegex) || stripped.match(conversationalBoRegex);
        return { matched: true, matchedWord: match ? match[0].trim() : 'โบ้' };
      }
    }

    // 3. Ultra sensitivity soft-voice & whisper acoustic confusion (sensitivity >= 70)
    // When whispering or speaking softly from a distance, Thai STT frequently mis-transcribes "โบ้" as:
    // "โด้", "โม้", "โก้", "โอ้", "โม่", "บู่", "บอส", "บ๊อบ", "บ๊วย", "โบ้ะ"
    if (this.sensitivity >= 70) {
      const whisperRegex = /^(?:ไอ้|น้อง|บัก|เฮ้|เฮ้ย)?\s*(?:โ[ด้ม้ก้อ้ม่ผ่]|บู่|บอส|บ๊อบ|บ๊วย|โบ้ะ|โป๊ะ)\s*(?:ครับ|ค่ะ|จ้า|จ๋า|แก|นะ|วะ|โว้ย|เปิด|ปิด|ช่วย|กี่โมง|สภาพอากาศ|เพลง|ทำอะไร|ฟัง|หน่อย)?/i;
      if (whisperRegex.test(raw)) {
        const match = raw.match(whisperRegex);
        return { matched: true, matchedWord: match ? match[0].trim() : 'โบ้' };
      }
    }

    return { matched: false, matchedWord: '' };
  }

  // Ensures OS/Chromium enables hardware Auto-Gain Control (AGC) for whisper/soft voice boost
  private async ensureMicrophonePreAmp(): Promise<void> {
    if (this.preAmpStream && this.preAmpStream.active) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        this.preAmpStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true, // Forces Windows & Chromium audio stack to boost soft / quiet input!
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }
    } catch (_) {
      // Graceful fallback if mic is already captured
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
      this.recognition.maxAlternatives = 5; // Return top 5 phonetic candidates for maximum soft voice sensitivity
      this.recognition.lang = 'th-TH';

      this.recognition.onresult = (event: any) => {
        if (!this.isListeningForWakeWord && this.voiceSessionState === 'idle') return;
        if (this.voiceSessionState === 'speaking') return; // Ignore mic while Bo is speaking

        const wordsToMatch = [this.currentWakeWord, ...this.alternateWakeWords]
          .filter(Boolean)
          .sort((a, b) => b.length - a.length); // Longest first to avoid partial prefix collisions

        // STATE 1: Waiting for wake word (e.g. "ไอ้โบ้", "โบ้", "น้องโบ", whisper variants)
        if (this.voiceSessionState === 'listening_wake' || this.voiceSessionState === 'idle') {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const resItem = event.results[i];
            if (!resItem) continue;

            // Check across all candidate alternatives (up to 5) for soft / quiet speech detection
            for (let j = 0; j < resItem.length; j++) {
              const rawPhrase = (resItem[j]?.transcript || '').trim();
              if (!rawPhrase) continue;

              const { matched, matchedWord } = this.checkWakeWordMatch(rawPhrase);
              if (matched) {
                console.log('[Bo AI Wake Word Heard]:', rawPhrase, '| Matched:', matchedWord, `(candidate #${j})`);
                this.commandStartResultIndex = i;
                this.voiceSessionState = 'capturing_command';
                this.playChime('wake');
                this.wakeWordCallbacks.forEach(cb => cb());

                // Extract any trailing command spoken in the same breath
                const pos = rawPhrase.toLowerCase().indexOf(matchedWord.toLowerCase());
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
            } catch (_) {
              // Resilient retry in 300ms if engine was in transitional state
              setTimeout(() => {
                try {
                  if (this.isListeningForWakeWord && this.voiceSessionState !== 'speaking') {
                    this.recognition.start();
                  }
                } catch (__) {}
              }, 300);
            }
          }, 100);
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

  public async startWakeWordDetection() {
    this.isListeningForWakeWord = true;
    this.voiceSessionState = 'listening_wake';
    await this.ensureMicrophonePreAmp();
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
    if (this.preAmpStream) {
      this.preAmpStream.getTracks().forEach(t => t.stop());
      this.preAmpStream = null;
    }
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

  // Normalize Thai conversational text for natural, smooth TTS without robotic interruptions
  public normalizeThaiTtsText(text: string): string {
    return text
      // Strip code blocks & markdown
      .replace(/```[\s\S]*?```/g, 'ดูโค้ดบนจอได้เลยนะ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#>-]/g, ' ')
      // Convert weather & measurement units to natural spoken Thai
      .replace(/(\d+(?:\.\d+)?)\s*°C/g, (_m, n) => `${n} องศา`)
      .replace(/°C/g, ' องศา')
      .replace(/(\d+(?:\.\d+)?)\s*km\/h/gi, (_m, n) => `${n} กิโลเมตรต่อชั่วโมง`)
      .replace(/km\/h/gi, ' กิโลเมตรต่อชั่วโมง')
      .replace(/(\d+(?:\.\d+)?)\s*%/g, (_m, n) => `${n} เปอร์เซ็นต์`)
      // Clean parentheses so TTS doesn't say "วงเล็บเปิด...วงเล็บปิด"
      .replace(/\(([^)]+)\)/g, ', $1, ')
      .replace(/[()[\]{}"'“”‘’]/g, ' ')
      // Strip emojis
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Normalize multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Split Thai text into natural conversational chunks without cutting words
  public splitIntoNaturalThaiChunks(text: string, maxLen = 130): string[] {
    const cleaned = this.normalizeThaiTtsText(text);
    if (!cleaned) return [];

    // Split on breath pauses and conversational boundaries
    const rawSegments = cleaned.split(/(?<=[.!?\n]|นะแก|แล้วนะ|เลยนะ|จ้า|ครับ|ค่ะ|เลย|แต่|และ)\s+/);
    const chunks: string[] = [];
    let current = '';

    for (const seg of rawSegments) {
      const part = seg.trim();
      if (!part) continue;

      if ((current + ' ' + part).length > maxLen) {
        if (current.trim()) chunks.push(current.trim());
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [cleaned.slice(0, maxLen)];
  }

  // Text-to-Speech (TTS) - Supports Natural Thai Female Voice, Grok, OpenAI & Browser Fallback
  public async speak(text: string, rate = 1.20, pitch = 1.0): Promise<void> {
    this.setSpeakingState(true);
    try {
      const settings = db.getSettings();
      const effectiveRate = rate || settings.tts_rate || 1.20;

      // 1. Natural Thai Female Voice (Free, Studio Clarity - Recommended)
      if (settings.tts_engine === 'natural_female' || !settings.tts_engine) {
        try {
          await this.speakWithNaturalFemale(text, effectiveRate);
          return;
        } catch (err) {
          console.warn('Natural female TTS failed, falling back to browser:', err);
        }
      }

      // 2. Grok Voice (xAI TTS API with leo, rex, ara, eve, sal)
      if (settings.tts_engine === 'grok') {
        if (settings.grok_api_key) {
          try {
            await this.speakWithGrok(
              this.normalizeThaiTtsText(text),
              settings.grok_api_key,
              settings.grok_tts_voice || 'leo',
              effectiveRate
            );
            return;
          } catch (err) {
            console.warn('Grok TTS failed, falling back to Natural Female Voice:', err);
          }
        }
        // Fallback to Natural Female Voice if no key or error
        try {
          await this.speakWithNaturalFemale(text, effectiveRate);
          return;
        } catch (_) {}
      }

      // 3. OpenAI Natural Voice (If user configured and has credits)
      if (settings.tts_engine === 'openai') {
        if (settings.openai_api_key) {
          try {
            await this.speakWithOpenAI(
              this.normalizeThaiTtsText(text),
              settings.openai_api_key,
              settings.openai_tts_voice || 'nova',
              settings.openai_tts_model || 'tts-1-hd',
              effectiveRate
            );
            return;
          } catch (err) {
            console.warn('OpenAI TTS failed (possibly quota exhausted), falling back to Natural Female Voice:', err);
          }
        }
        // Fallback to Natural Female Voice if no key or error
        try {
          await this.speakWithNaturalFemale(text, effectiveRate);
          return;
        } catch (_) {}
      }

      // 4. Browser SpeechSynthesis fallback
      await this.speakWithBrowser(text, effectiveRate, pitch);
    } finally {
      this.setSpeakingState(false);
    }
  }

  // Natural Thai Female Voice (Studio Clarity, 100% Free)
  public async speakWithNaturalFemale(text: string, speed = 1.20): Promise<void> {
    this.stopSpeaking();

    const chunks = this.splitIntoNaturalThaiChunks(text);
    if (chunks.length === 0) return;

    // Sequential audio playback with crisp, natural speech rate
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      await new Promise<void>(async (resolve, reject) => {
        let audioSrc = `/api/tts?text=${encodeURIComponent(chunk.trim())}`;

        // In Electron, fetch data URL via IPC to bypass CORS / file:// limitations
        if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchTts) {
          try {
            const ipcRes = await (window as any).electronAPI.fetchTts(chunk.trim());
            if (ipcRes && ipcRes.success && ipcRes.dataUrl) {
              audioSrc = ipcRes.dataUrl;
            }
          } catch (e) {
            console.warn('[AudioService] IPC fetchTts error:', e);
          }
        }

        const audio = new Audio(audioSrc);
        const effectiveSpeed = Math.max(0.8, Math.min(2.0, speed || 1.20));
        audio.playbackRate = effectiveSpeed;
        this.currentAudioElement = audio;

        audio.onended = () => {
          this.currentAudioElement = null;
          resolve();
        };
        audio.onerror = (e) => {
          this.currentAudioElement = null;
          reject(e);
        };
        audio.play().catch((e) => {
          this.currentAudioElement = null;
          reject(e);
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

  // xAI Grok TTS API (leo, rex, ara, eve, sal)
  public async speakWithGrok(
    text: string,
    apiKey: string,
    voice: string = 'leo',
    speed: number = 1.0
  ): Promise<void> {
    this.stopSpeaking();

    // 1. Primary: Native Electron IPC Proxy (bypasses browser CORS & supports official xAI TTS endpoint)
    if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchGrokTts) {
      try {
        const res = await (window as any).electronAPI.fetchGrokTts({
          text,
          apiKey,
          voice: voice || 'leo',
        });

        if (res?.success && res.dataUrl) {
          return new Promise((resolve) => {
            const audio = new Audio(res.dataUrl);
            audio.playbackRate = Math.max(0.5, Math.min(2.0, speed || 1.0));
            this.currentAudioElement = audio;

            audio.onended = () => {
              this.currentAudioElement = null;
              resolve();
            };
            audio.onerror = (e) => {
              console.warn('Grok IPC audio playback error:', e);
              this.currentAudioElement = null;
              resolve();
            };
            audio.play().catch((e) => {
              console.warn('Audio play error:', e);
              resolve();
            });
          });
        } else if (res?.error) {
          console.warn('[AudioService] fetchGrokTts IPC reported error:', res.error);
        }
      } catch (ipcErr) {
        console.warn('[AudioService] fetchGrokTts IPC fallback to direct fetch:', ipcErr);
      }
    }

    // 2. Secondary: Direct Web Fetch via official xAI TTS endpoint https://api.x.ai/v1/tts
    let response = await fetch('https://api.x.ai/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: voice || 'leo',
        language: 'auto',
      }),
    });

    // 3. Fallback to OpenAI-compatible endpoint if /v1/tts returns 404
    if (!response.ok && response.status === 404) {
      response = await fetch('https://api.x.ai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice || 'leo',
          speed: Math.max(0.5, Math.min(2.0, speed || 1.0)),
        }),
      });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Grok TTS HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.playbackRate = Math.max(0.5, Math.min(2.0, speed || 1.0));
    this.currentAudioElement = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudioElement = null;
        resolve();
      };
      audio.onerror = (e) => {
        console.warn('Grok audio playback error:', e);
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

  // Apply Grok-style witty & rapid cadence using free Studio Voice (No API Key Required)
  public applyGrokFreePreset(): void {
    const currentSettings = db.getSettings();
    db.saveSettings({
      ...currentSettings,
      tts_engine: 'natural_female',
      tts_rate: 1.25, // Witty, rapid cadence matching Grok
      tts_pitch: 1.0,
    });
    const pers = db.getPersonality();
    if (pers.tuning) {
      pers.tuning.wittiness = 85;
      pers.tuning.conciseness = 85;
      pers.tuning.friendliness = 90;
      db.savePersonality(pers);
    }
  }

  // Browser SpeechSynthesis with Natural Thai voice prioritization
  public speakWithBrowser(text: string, rate = 1.20, pitch = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported');
        setTimeout(resolve, 1500);
        return;
      }

      window.speechSynthesis.cancel();
      const cleaned = this.normalizeThaiTtsText(text);
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'th-TH';
      utterance.rate = Math.max(0.8, Math.min(2.0, rate || 1.20));
      utterance.pitch = pitch || 1.0;

      // Select highest quality Natural / Online Thai voice if available
      const voices = window.speechSynthesis.getVoices();
      const thaiVoices = voices.filter(v => v.lang.includes('th') || v.name.toLowerCase().includes('thai'));
      const femaleVoice = thaiVoices.find(v =>
        v.name.toLowerCase().includes('premwadee') ||
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('woman')
      );
      const naturalVoice =
        femaleVoice ||
        thaiVoices.find(v => v.name.toLowerCase().includes('natural')) ||
        thaiVoices.find(v => v.name.toLowerCase().includes('online')) ||
        thaiVoices[0];

      if (naturalVoice) {
        utterance.voice = naturalVoice;
        // If system only has male voice (e.g. Pattara / Niwat on Windows 10/11), adjust pitch to sound youthful & friendly
        const isMaleVoice = naturalVoice.name.toLowerCase().includes('pattara') || naturalVoice.name.toLowerCase().includes('niwat') || naturalVoice.name.toLowerCase().includes('david');
        if (isMaleVoice && !femaleVoice) {
          utterance.pitch = Math.min(2.0, (pitch || 1.0) * 1.30);
        }
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
