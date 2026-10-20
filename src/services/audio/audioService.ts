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
  private currentWakeWord = 'โนอา';
  private alternateWakeWords: string[] = ['โนอา', 'น้องโนอา', 'ไอ้โนอา', 'คุณโนอา', 'โนอาห์', 'noar', 'noah', 'Hey Noar'];
  private sensitivity = 75; // 0-100
  private selectedDeviceId = 'default';
  private unifiedMediaStream: MediaStream | null = null;
  private preAmpStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedAudioChunks: Blob[] = [];
  private vadCheckInterval: any = null;
  private isRecordingForCommand = false;
  private isTranscribingAudio = false;
  private silenceDetectedMs = 0;
  private hasUserStartedTalking = false;

  // Desktop Continuous VAD Wake Word Engine with Circular PCM Audio Buffer
  private vadWakeInterval: any = null;
  private isDesktopVadWakeActive = false;
  private isUserCurrentlySpeaking = false;
  private speechStartTime = 0;
  private lastSpeechTime = 0;
  private isProcessingWakeSnippet = false;
  private pcmRingBuffer: Float32Array | null = null;
  private pcmRingIndex = 0;
  private pcmTotalSamplesCollected = 0;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private dummyGainNode: GainNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;

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
    const boKeywords = ['โบ้', 'ไอ้โบ้', 'น้องโบ', 'bo ai', 'boai', 'โบว์', 'โบ', 'ไอโบ้', 'บักโบ้', 'hey bo'];
    // Filter out any Bo keywords that might have been passed
    const alts = alternates.filter(
      w => !boKeywords.some(b => w.toLowerCase().trim() === b.toLowerCase().trim() || w.toLowerCase().includes('โบ้') || w.toLowerCase().includes('bo ai'))
    );
    
    // Auto add comprehensive natural Thai greetings, tone variants, and phonetic forms for Noar / โนอา
    alts.push(
      'โนอา', 'โนอาห์', 'โนอาร์', 'โนอ่า', 'โนอ้า', 'โนอ๊า', 'โนวา', 'โนฮา', 'โนอาา',
      'ไอ้โนอา', 'ไอโนอา', 'ไอ้โนอาห์', 'ไอโนอาห์',
      'น้องโนอา', 'น้องโนอาห์',
      'พี่โนอา', 'พี่โนอาห์',
      'คุณโนอา', 'คุณโนอาห์',
      'เจ้าโนอา', 'เจ้าโนอาห์',
      'บักโนอา', 'บักโนอาห์',
      'เฮ้ยโนอา', 'เฮ้โนอา', 'เฮ้โนอาห์',
      'ฮัลโหลโนอา', 'ฮัลโหลโนอาห์',
      'โนอาครับ', 'โนอาค่ะ', 'โนอาคะ', 'โนอาจ๋า', 'โนอาเอ้ย', 'โนอาเอย',
      'noar', 'noah', 'noa', 'nora',
      'hey noar', 'hey noah', 'hi noar', 'hi noah', 'hello noar', 'ok noar'
    );
    
    this.alternateWakeWords = Array.from(new Set(alts.map(w => w.toLowerCase().trim()).filter(Boolean)));
    this.sensitivity = sensitivity;

    // Restart recognizer if already listening so new words take effect immediately
    if (this.isListeningForWakeWord && this.recognition) {
      // Guard: Never abort speech recognition if user is actively in the middle of a command or assistant is speaking
      if (this.voiceSessionState === 'capturing_command' || this.voiceSessionState === 'speaking') {
        return;
      }
      try {
        this.recognition.abort();
      } catch (_) {}
      setTimeout(() => {
        if (this.isListeningForWakeWord && this.voiceSessionState !== 'capturing_command' && this.voiceSessionState !== 'speaking') {
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

    // Guard against common Thai non-name words (e.g. โบราณ, โน้ตบุ๊ก, โน้ต, โนเนม)
    const nonWakeWordsRegex = /(?:โบราณ|โบสถ์|โบกมือ|โบก|โบรก|โบว์ลิ่ง|โน้ต|โน๊ต|โน้ตบุ๊ก|โน๊ตบุ๊ค|โนเนม|โนลิมิต|โนคอมเมนต์)/i;
    if (nonWakeWordsRegex.test(raw) && !raw.includes('โนอา')) {
      return { matched: false, matchedWord: '' };
    }

    const wordsToMatch = [this.currentWakeWord, ...this.alternateWakeWords]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    // 1. Direct match on full transcript and tone-stripped transcript
    for (const w of wordsToMatch) {
      const wLower = w.toLowerCase();
      if (raw.includes(wLower)) {
        return { matched: true, matchedWord: w };
      }
      const wStripped = this.stripThaiToneMarks(wLower);
      if (stripped.includes(wStripped)) {
        return { matched: true, matchedWord: w };
      }
    }

    // 2. High sensitivity regex matching (sensitivity >= 50)
    if (this.sensitivity >= 50) {
      const conversationalRegex = /(?:ไอ้|ไอ|น้อง|พี่|น้า|บัก|คุณ|เฮ้ย|เฮ้|ฮัลโหล|เจ้า|ฮัลโล)?\s*(?:โน[อวฮ][าห์่้๊๋]?|โนอาร์|โนอาห์|noar|noah|noa|nora)(?:$|\s|[ครับ|ค่ะ|จ้า|จ๋า|แก|นะ|วะ|โว้ย|เปิด|ปิด|ช่วย|กี่โมง|สภาพอากาศ|เพลง|ทำอะไร|ฟัง|หน่อย|วัน|ตอน])/i;
      if (conversationalRegex.test(raw) || conversationalRegex.test(stripped)) {
        const match = raw.match(conversationalRegex) || stripped.match(conversationalRegex);
        return { matched: true, matchedWord: match ? match[0].trim() : 'โนอา' };
      }
    }

    // 3. Ultra sensitivity soft-voice & whisper acoustic confusion (sensitivity >= 70)
    if (this.sensitivity >= 70) {
      const whisperRegex = /^(?:ไอ้|น้อง|บัก|เฮ้|เฮ้ย)?\s*(?:โน[อวฮ][าห์่้๊๋]?|โลอา|โอนา|โนวา|โนฮา|โมอา|โงอา|โป๊ะ)\s*(?:ครับ|ค่ะ|จ้า|จ๋า|แก|นะ|วะ|โว้ย|เปิด|ปิด|ช่วย|กี่โมง|สภาพอากาศ|เพลง|ทำอะไร|ฟัง|หน่อย)?/i;
      if (whisperRegex.test(raw)) {
        const match = raw.match(whisperRegex);
        return { matched: true, matchedWord: match ? match[0].trim() : 'โนอา' };
      }
    }

    return { matched: false, matchedWord: '' };
  }

  // Ensures OS/Chromium enables hardware Auto-Gain Control (AGC) for whisper/soft voice boost (from 6ffcde3)
  private async ensureMicrophonePreAmp(): Promise<void> {
    if (this.preAmpStream && this.preAmpStream.active) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const targetId = this.selectedDeviceId || db.getSettings().input_device_id || 'default';
        this.preAmpStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: targetId && targetId !== 'default' ? { exact: targetId } : undefined,
            autoGainControl: true, // Forces Windows & Chromium audio stack to boost soft / quiet input!
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        this.unifiedMediaStream = this.preAmpStream;
      }
    } catch (_) {
      // Graceful fallback if mic is already captured
    }
  }

  public async setInputDevice(deviceId: string): Promise<void> {
    this.selectedDeviceId = deviceId;
    if (this.unifiedMediaStream) {
      try {
        this.unifiedMediaStream.getTracks().forEach(t => t.stop());
      } catch (_) {}
      this.unifiedMediaStream = null;
      this.analyser = null;
      if (this.isListeningForWakeWord || this.voiceSessionState === 'capturing_command') {
        await this.startMicrophoneMeter(deviceId);
      }
    }
  }

  public async getOrCreateMediaStream(deviceId?: string): Promise<MediaStream | null> {
    const targetId = deviceId || this.selectedDeviceId || db.getSettings().input_device_id || 'default';
    if (this.unifiedMediaStream && this.unifiedMediaStream.active) {
      return this.unifiedMediaStream;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId: targetId && targetId !== 'default' ? { exact: targetId } : undefined,
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        };
        this.unifiedMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        return this.unifiedMediaStream;
      }
    } catch (e) {
      console.warn('[AudioService] Could not open specific mic stream, falling back to default:', e);
      try {
        this.unifiedMediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
        });
        return this.unifiedMediaStream;
      } catch (err) {
        console.warn('[AudioService] Fatal mic getUserMedia error:', err);
      }
    }
    return null;
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

  public getWakeThreshold(): number {
    // Dynamic trigger threshold based on RMS time-domain speech energy:
    // Sensitivity 100 -> 5% (whisper)
    // Sensitivity 75 -> 9% (soft voice)
    // Sensitivity 50 -> 14% (normal)
    // Sensitivity 0 -> 23%
    const s = Math.max(0, Math.min(100, this.sensitivity));
    return Math.max(5, Math.round(23 - (s * 0.18)));
  }

  // Real-time Mic Level Visualizer
  public async startMicrophoneMeter(deviceId?: string): Promise<boolean> {
    try {
      if (deviceId) {
        this.selectedDeviceId = deviceId;
      }
      const stream = await this.getOrCreateMediaStream(deviceId);
      if (!stream) return false;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3;
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
      }

      // Initialize Continuous PCM Circular Audio Ring Buffer
      this.setupPcmRingBuffer(stream);

      const timeData = new Uint8Array(this.analyser.fftSize);
      const updateMeter = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(timeData);
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        this.micLevel = Math.min(100, Math.round(rms * 280));

        if (this.unifiedMediaStream?.active || this.preAmpStream?.active) {
          requestAnimationFrame(updateMeter);
        }
      };
      requestAnimationFrame(updateMeter);
      return true;
    } catch (e) {
      console.warn('Microphone meter start error:', e);
      return false;
    }
  }

  // Setup Continuous PCM Circular Audio Ring Buffer (background safe, works even when window unfocused/minimized)
  private setupPcmRingBuffer(stream: MediaStream) {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const sampleRate = this.audioContext.sampleRate || 44100;
      const ringBufferSize = Math.round(sampleRate * 3.5); // 3.5 seconds circular buffer
      if (!this.pcmRingBuffer || this.pcmRingBuffer.length !== ringBufferSize) {
        this.pcmRingBuffer = new Float32Array(ringBufferSize);
        this.pcmRingIndex = 0;
        this.pcmTotalSamplesCollected = 0;
      }

      if (!this.scriptProcessor) {
        this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
        this.dummyGainNode = this.audioContext.createGain();
        this.dummyGainNode.gain.value = 0; // Muted so user never hears mic feedback

        this.scriptProcessor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          if (!this.pcmRingBuffer) return;
          const bufLen = this.pcmRingBuffer.length;
          let sumSquares = 0;
          for (let i = 0; i < input.length; i++) {
            const s = input[i];
            sumSquares += s * s;
            this.pcmRingBuffer[this.pcmRingIndex] = s;
            this.pcmRingIndex = (this.pcmRingIndex + 1) % bufLen;
          }
          this.pcmTotalSamplesCollected += input.length;
          const rms = Math.sqrt(sumSquares / input.length);
          // Update real-time mic level directly from hardware audio thread
          this.micLevel = Math.min(100, Math.round(rms * 320));
        };

        if (!this.micSourceNode) {
          this.micSourceNode = this.audioContext.createMediaStreamSource(stream);
        }
        this.micSourceNode.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.dummyGainNode);
        this.dummyGainNode.connect(this.audioContext.destination);
      }
    } catch (err) {
      console.warn('[AudioService] setupPcmRingBuffer error:', err);
    }
  }

  // Extract recent N seconds of unclipped PCM audio samples from circular ring buffer
  public getRecentAudioSamples(durationSeconds: number): { samples: Float32Array; sampleRate: number } {
    if (!this.pcmRingBuffer || !this.audioContext || this.pcmTotalSamplesCollected === 0) {
      return { samples: new Float32Array(0), sampleRate: 44100 };
    }
    const sampleRate = this.audioContext.sampleRate || 44100;
    const neededSamples = Math.min(
      Math.round(sampleRate * durationSeconds),
      this.pcmRingBuffer.length,
      this.pcmTotalSamplesCollected
    );
    const result = new Float32Array(neededSamples);
    const bufLen = this.pcmRingBuffer.length;
    let startIdx = (this.pcmRingIndex - neededSamples + bufLen) % bufLen;
    for (let i = 0; i < neededSamples; i++) {
      result[i] = this.pcmRingBuffer[(startIdx + i) % bufLen];
    }
    return { samples: result, sampleRate };
  }

  public getMicrophoneLevel(): number {
    return this.micLevel;
  }

  public stopMicrophoneMeter(): void {
    if (!this.isListeningForWakeWord && this.voiceSessionState === 'idle') {
      if (this.scriptProcessor) {
        try {
          this.scriptProcessor.disconnect();
        } catch (_) {}
        this.scriptProcessor = null;
      }
      if (this.dummyGainNode) {
        try {
          this.dummyGainNode.disconnect();
        } catch (_) {}
        this.dummyGainNode = null;
      }
      if (this.micSourceNode) {
        try {
          this.micSourceNode.disconnect();
        } catch (_) {}
        this.micSourceNode = null;
      }
      if (this.unifiedMediaStream) {
        this.unifiedMediaStream.getTracks().forEach(t => t.stop());
        this.unifiedMediaStream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
      this.analyser = null;
      this.micLevel = 0;
    }
  }

  // Helper: Encode raw Float32Array PCM samples into standard 16-bit Mono WAV Blob
  public encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 * 2)
    view.setUint16(32, 2, true); // BlockAlign (1 * 2)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write 16-bit PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const b64 = res.split(',')[1] || '';
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

        // STATE 1: Waiting for wake word (e.g. "โนอา", "น้องโนอา", "noar", "ไอ้โบ้", whisper variants)
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
                console.log('[Bo AI Wake Word Heard via SpeechRecognition]:', rawPhrase, '| Matched:', matchedWord, `(candidate #${j})`);

                // Extract any trailing command spoken in the same breath
                const pos = rawPhrase.toLowerCase().indexOf(matchedWord.toLowerCase());
                let trailing = '';
                if (pos !== -1) {
                  trailing = rawPhrase.slice(pos + matchedWord.length).trim();
                }

                // If user spoke full command in the same breath (length >= 2)
                if (trailing && trailing.length >= 2) {
                  this.playChime('wake');
                  this.wakeWordCallbacks.forEach(cb => cb());
                  this.finalizeCommand(trailing);
                  return;
                }

                // User just called "โนอา":
                // Abort SpeechRecognition so it releases the mic cleanly,
                // then start the high-accuracy Whisper conversation engine!
                try {
                  this.recognition.abort();
                } catch (_) {}

                this.startManualVoiceCommand();
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
          console.warn('[AudioService] SpeechRecognition error:', e);
        }
        if (e.error === 'network' || e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          console.log('[AudioService] Web Speech API blocked or unavailable. Switching to Desktop VAD Wake Word Engine.');
          this.startDesktopVadWakeDetector();
        }
      };

      this.recognition.onend = () => {
        if (this.voiceSessionState === 'capturing_command') {
          // If session ended mid-command, reset start index for next event
          this.commandStartResultIndex = 0;
        }
        if (this.isListeningForWakeWord && this.voiceSessionState !== 'speaking') {
          const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI);
          if (isElectron) {
            this.startDesktopVadWakeDetector();
            return;
          }
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
                } catch (__) {
                  this.startDesktopVadWakeDetector();
                }
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
    if (this.isListeningForWakeWord && (this.voiceSessionState === 'capturing_command' || this.voiceSessionState === 'speaking')) {
      return;
    }
    this.isListeningForWakeWord = true;
    if (this.voiceSessionState !== 'capturing_command' && this.voiceSessionState !== 'speaking') {
      this.voiceSessionState = 'listening_wake';
    }

    await this.ensureMicrophonePreAmp();

    const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI);
    if (isElectron) {
      console.log('[AudioService] Electron detected: Starting Continuous Desktop VAD Wake Word Engine.');
      await this.startDesktopVadWakeDetector();
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.start();
        console.log('[AudioService] Web Speech wake detector started.');
      } catch (err: any) {
        if (err.name !== 'InvalidStateError') {
          console.warn('[AudioService] recognition.start warning:', err);
        }
        await this.startDesktopVadWakeDetector();
      }
    } else {
      await this.startDesktopVadWakeDetector();
    }
  }

  public stopWakeWordDetection() {
    this.isListeningForWakeWord = false;
    this.voiceSessionState = 'idle';
    if (this.vadWakeInterval) {
      clearInterval(this.vadWakeInterval);
      this.vadWakeInterval = null;
    }
    this.isDesktopVadWakeActive = false;
    this.isUserCurrentlySpeaking = false;
    this.isProcessingWakeSnippet = false;
    if (this.commandSilenceTimer) clearTimeout(this.commandSilenceTimer);
    if (this.commandMaxTimer) clearTimeout(this.commandMaxTimer);
    if (this.vadCheckInterval) {
      clearInterval(this.vadCheckInterval);
      this.vadCheckInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }
    this.isRecordingForCommand = false;
    if (this.preAmpStream) {
      this.preAmpStream.getTracks().forEach(t => t.stop());
      this.preAmpStream = null;
    }
    this.unifiedMediaStream = null;
    this.stopMicrophoneMeter();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  // Start continuous Desktop VAD wake word detector with circular pre-roll PCM audio buffer
  public async startDesktopVadWakeDetector(): Promise<void> {
    if (this.isDesktopVadWakeActive) return;
    this.isDesktopVadWakeActive = true;

    await this.ensureMicrophonePreAmp();
    const stream = await this.getOrCreateMediaStream();
    if (stream) {
      this.setupPcmRingBuffer(stream);
    }
    await this.startMicrophoneMeter();

    if (this.vadWakeInterval) clearInterval(this.vadWakeInterval);

    this.vadWakeInterval = setInterval(async () => {
      // Only process when in listening_wake state and not speaking/capturing command
      if (!this.isListeningForWakeWord || this.voiceSessionState !== 'listening_wake' || this.isProcessingWakeSnippet) {
        this.isUserCurrentlySpeaking = false;
        return;
      }

      const currentLevel = this.micLevel;
      const threshold = this.getWakeThreshold();
      const now = Date.now();

      // CASE 1: Currently waiting for speech onset
      if (!this.isUserCurrentlySpeaking) {
        if (currentLevel >= threshold) {
          this.isUserCurrentlySpeaking = true;
          this.speechStartTime = now;
          this.lastSpeechTime = now;
        }
      }
      // CASE 2: User is currently speaking
      else {
        if (currentLevel >= threshold) {
          this.lastSpeechTime = now;
        }

        const speechDuration = now - this.speechStartTime;
        const silenceDuration = now - this.lastSpeechTime;

        // Wake trigger conditions:
        // 1. Spoke for at least 180ms and then paused for 300ms (e.g. said "โนอา" <pause>)
        // 2. Continuous sentence spoken for >= 2.0s (e.g. said "โนอา เปิดเพลงหน่อย")
        const isPauseAfterSpeech = speechDuration >= 180 && silenceDuration >= 300;
        const isMaxDurationReached = speechDuration >= 2000;

        if (isPauseAfterSpeech || isMaxDurationReached) {
          this.isUserCurrentlySpeaking = false;
          // Pull audio from circular buffer: speech duration + 450ms pre-speech attack buffer
          const pullSeconds = Math.min(3.0, (speechDuration + 450) / 1000);
          await this.evaluateWakeWordFromBuffer(pullSeconds);
        }
      }
    }, 60);
  }

  private async evaluateWakeWordFromBuffer(pullSeconds: number): Promise<void> {
    const { samples, sampleRate } = this.getRecentAudioSamples(pullSeconds);
    if (samples.length < sampleRate * 0.25) {
      return;
    }

    const wavBlob = this.encodeWAV(samples, sampleRate);
    if (wavBlob.size < 1000) return;

    this.isProcessingWakeSnippet = true;

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || '');
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(wavBlob);
      const audioBase64 = await base64Promise;

      if (!audioBase64) {
        this.isProcessingWakeSnippet = false;
        return;
      }

      let transcribedText = '';

      // 1. Electron IPC Whisper (Groq Whisper-large-v3-turbo / OpenAI Whisper)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.transcribeAudio) {
        const settings = db.getSettings();
        const ipcRes = await (window as any).electronAPI.transcribeAudio({
          audioBase64,
          mimeType: 'audio/wav',
          language: 'th',
          apiKey: settings.meta_api_key || '',
        });
        if (ipcRes?.success && ipcRes?.text) {
          transcribedText = ipcRes.text;
        }
      }

      // 2. Direct web fallback if outside electron or failed
      if (!transcribedText) {
        try {
          const settings = db.getSettings();
          const groqKey =
            settings.meta_api_key ||
            (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GROQ_API_KEY) ||
            '';
          const formData = new FormData();
          formData.append('file', wavBlob, 'wake.wav');
          formData.append('model', 'whisper-large-v3-turbo');
          formData.append('language', 'th');

          const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
            },
            body: formData,
          });
          if (resp.ok) {
            const json = await resp.json();
            transcribedText = json.text || '';
          }
        } catch (_) {}
      }

      const raw = (transcribedText || '').trim();
      if (!raw) {
        this.isProcessingWakeSnippet = false;
        return;
      }

      console.log('[Bo AI Desktop Ring Buffer Heard]:', raw);

      const { matched, matchedWord } = this.checkWakeWordMatch(raw);

      if (matched && (this.voiceSessionState === 'listening_wake' || this.voiceSessionState === 'idle')) {
        console.log('[Bo AI Desktop Wake Word SUCCESS]:', raw, '| Matched:', matchedWord);

        // Check if user spoke a full command along with wake word (e.g. "โนอา เปิดเพลงหน่อย")
        const pos = raw.toLowerCase().indexOf(matchedWord.toLowerCase());
        let trailing = '';
        if (pos !== -1) {
          trailing = raw.slice(pos + matchedWord.length).trim();
          trailing = trailing.replace(/^[,.:;!?-]+\s*/, '').trim();
        }

        if (trailing && trailing.length >= 2) {
          this.playChime('wake');
          this.wakeWordCallbacks.forEach((cb) => cb());
          this.finalizeCommand(trailing);
        } else {
          // User just called "โนอา", startManualVoiceCommand triggers wake chime & begins capturing command!
          this.wakeWordCallbacks.forEach((cb) => cb());
          await this.startManualVoiceCommand();
        }
      }
    } catch (err) {
      console.warn('[AudioService] evaluateWakeWordFromBuffer error:', err);
    } finally {
      this.isProcessingWakeSnippet = false;
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

  // Start high-fidelity audio recorder with Voice Activity Detection (VAD)
  public async startAudioRecording(): Promise<boolean> {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (_) {}
      }

      const stream = await this.getOrCreateMediaStream();
      if (!stream) {
        console.warn('[AudioService] No active stream for startAudioRecording');
        return false;
      }

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
        }
      }

      this.recordedAudioChunks = [];
      this.mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedAudioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecordingForCommand = true;
      this.hasUserStartedTalking = false;
      this.silenceDetectedMs = 0;

      this.startVadSilenceDetection();
      return true;
    } catch (err) {
      console.warn('[AudioService] Failed to start MediaRecorder:', err);
      return false;
    }
  }

  private startVadSilenceDetection() {
    if (this.vadCheckInterval) clearInterval(this.vadCheckInterval);

    let checkCount = 0;
    const speechThreshold = Math.max(5, this.getWakeThreshold() - 2);

    this.vadCheckInterval = setInterval(() => {
      if (!this.isRecordingForCommand) {
        clearInterval(this.vadCheckInterval);
        return;
      }

      checkCount++;
      const currentLevel = this.getMicrophoneLevel();

      // If user voice energy exceeds speech threshold
      if (currentLevel >= speechThreshold) {
        if (!this.hasUserStartedTalking) {
          this.hasUserStartedTalking = true;
          this.interimSpeechCallbacks.forEach(cb => cb('กำลังรับฟังคำสั่งของคุณ...'));
        }
        this.silenceDetectedMs = 0;
      } else if (this.hasUserStartedTalking) {
        // User has already started talking, now measuring pause/silence
        this.silenceDetectedMs += 100;
        // After user spoke, 1.2 seconds of pause -> automatically finalize and transcribe!
        if (this.silenceDetectedMs >= 1200) {
          console.log('[AudioService] Silence pause detected (1.2s), stopping recording to transcribe.');
          this.stopRecordingAndTranscribe();
          return;
        }
      }

      // If user hasn't spoken at all after 7 seconds, revert to wake listening
      if (!this.hasUserStartedTalking && checkCount >= 70) {
        console.log('[AudioService] No speech detected in 7s, aborting command capture.');
        this.abortCommandRecording();
        return;
      }

      // Safety timeout (12 seconds max)
      if (checkCount >= 120) {
        console.log('[AudioService] Max duration reached (12s), stopping recording to transcribe.');
        this.stopRecordingAndTranscribe();
      }
    }, 100);
  }

  private abortCommandRecording() {
    if (this.vadCheckInterval) {
      clearInterval(this.vadCheckInterval);
      this.vadCheckInterval = null;
    }
    this.isRecordingForCommand = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }
    this.recordedAudioChunks = [];
    this.voiceSessionState = this.isListeningForWakeWord ? 'listening_wake' : 'idle';
    this.interimSpeechCallbacks.forEach(cb => cb(''));
  }

  public async stopRecordingAndTranscribe(): Promise<void> {
    if (this.vadCheckInterval) {
      clearInterval(this.vadCheckInterval);
      this.vadCheckInterval = null;
    }

    if (!this.isRecordingForCommand || !this.mediaRecorder) {
      return;
    }

    this.isRecordingForCommand = false;

    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = async () => {
          await this.processRecordedAudio();
          resolve();
        };
        try {
          this.mediaRecorder.stop();
        } catch (_) {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  private async processRecordedAudio(): Promise<void> {
    if (this.recordedAudioChunks.length === 0) {
      this.voiceSessionState = this.isListeningForWakeWord ? 'listening_wake' : 'idle';
      this.interimSpeechCallbacks.forEach(cb => cb(''));
      return;
    }

    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(this.recordedAudioChunks, { type: mimeType });
    this.recordedAudioChunks = [];

    // Ignore tiny audio click if user didn't speak
    if (audioBlob.size < 600 && !this.hasUserStartedTalking) {
      this.voiceSessionState = this.isListeningForWakeWord ? 'listening_wake' : 'idle';
      this.interimSpeechCallbacks.forEach(cb => cb(''));
      return;
    }

    this.isTranscribingAudio = true;
    this.interimSpeechCallbacks.forEach(cb => cb('กำลังถอดเสียงคำสั่ง...'));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;

      if (!audioBase64) {
        throw new Error('Empty audio base64');
      }

      let transcribedText = '';

      // 1. Electron IPC Whisper Transcription (Groq Whisper-large-v3-turbo / OpenAI Whisper)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.transcribeAudio) {
        const settings = db.getSettings();
        const ipcRes = await (window as any).electronAPI.transcribeAudio({
          audioBase64,
          mimeType,
          language: 'th',
          apiKey: settings.meta_api_key || '',
        });
        if (ipcRes?.success && ipcRes?.text) {
          transcribedText = ipcRes.text;
        }
      }

      // 2. Direct web fallback if outside electron
      if (!transcribedText) {
        try {
          const settings = db.getSettings();
          const groqKey =
            settings.meta_api_key ||
            (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GROQ_API_KEY) ||
            '';
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          formData.append('model', 'whisper-large-v3-turbo');
          formData.append('language', 'th');

          const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
            },
            body: formData,
          });
          if (resp.ok) {
            const json = await resp.json();
            transcribedText = json.text || '';
          }
        } catch (fetchErr) {
          console.warn('[AudioService] Direct fetch whisper error:', fetchErr);
        }
      }

      let cleanCommand = (transcribedText || '').trim();

      if (cleanCommand) {
        console.log('[AudioService] Whisper Transcribed Speech:', cleanCommand);

        // Strip wake word prefixes if user said "โนอา เปิดเพลงหน่อย"
        const wordsToMatch = [this.currentWakeWord, ...this.alternateWakeWords]
          .filter(Boolean)
          .sort((a, b) => b.length - a.length);
        for (const w of wordsToMatch) {
          const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`^${escaped}\\s*[,.:;]?\\s*`, 'i');
          cleanCommand = cleanCommand.replace(regex, '').trim();
        }

        if (cleanCommand.length >= 1) {
          this.interimSpeechCallbacks.forEach(cb => cb(cleanCommand));
          this.finalizeCommand(cleanCommand);
          return;
        }
      }

      this.voiceSessionState = this.isListeningForWakeWord ? 'listening_wake' : 'idle';
      this.interimSpeechCallbacks.forEach(cb => cb(''));
    } catch (e) {
      console.warn('[AudioService] Transcription process error:', e);
      this.voiceSessionState = this.isListeningForWakeWord ? 'listening_wake' : 'idle';
      this.interimSpeechCallbacks.forEach(cb => cb(''));
    } finally {
      this.isTranscribingAudio = false;
    }
  }

  // Trigger manual listening from microphone button, hotkey, OR wake word
  public async startManualVoiceCommand() {
    this.playChime('wake');
    this.voiceSessionState = 'capturing_command';
    this.currentCapturedTranscript = '';
    this.commandStartResultIndex = 0;

    // Abort speech recognition & wake recorder so microphone is completely free for command MediaRecorder
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_) {}
    }
    this.isUserCurrentlySpeaking = false;
    this.isProcessingWakeSnippet = false;

    await this.startMicrophoneMeter();
    await this.startAudioRecording();

    this.interimSpeechCallbacks.forEach(cb => cb('กำลังรับฟังคำสั่งของคุณ...'));
  }

  public setSpeakingState(speaking: boolean) {
    if (speaking) {
      this.voiceSessionState = 'speaking';
      this.isUserCurrentlySpeaking = false;
      this.isProcessingWakeSnippet = false;
      if (this.commandSilenceTimer) clearTimeout(this.commandSilenceTimer);
      if (this.commandMaxTimer) clearTimeout(this.commandMaxTimer);
      if (this.vadCheckInterval) {
        clearInterval(this.vadCheckInterval);
        this.vadCheckInterval = null;
      }
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (_) {}
      }
      this.isRecordingForCommand = false;

      // Abort mic recognition while Bo is speaking so it doesn't transcribe its own voice
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (_) {}
      }
    } else {
      this.voiceSessionState = this.isListeningForWakeWord ? 'listening_wake' : 'idle';
      this.isUserCurrentlySpeaking = false;
      this.isProcessingWakeSnippet = false;
      this.currentCapturedTranscript = '';
      this.commandStartResultIndex = 0;
      if (this.isListeningForWakeWord) {
        this.ensureMicrophonePreAmp().then(() => {
          const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI);
          if (isElectron) {
            this.startDesktopVadWakeDetector();
          } else if (this.recognition) {
            setTimeout(() => {
              try {
                if (this.isListeningForWakeWord && this.voiceSessionState === 'listening_wake') {
                  this.recognition.start();
                  console.log('[AudioService] Resumed wake word recognition after speaking.');
                }
              } catch (_) {
                this.startDesktopVadWakeDetector();
              }
            }, 200);
          } else {
            this.startDesktopVadWakeDetector();
          }
        });
      }
    }
  }

  private currentAudioElement: HTMLAudioElement | null = null;

  // Normalize Thai conversational text for natural, smooth, expressive TTS (Dynamic laughter, phonetics, rhythm)
  public normalizeThaiTtsText(text: string): string {
    if (!text) return '';

    let res = text
      // 1. Strip code blocks & markdown
      .replace(/```[\s\S]*?```/g, 'ดูโค้ดบนจอได้เลยนะ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#>-]/g, ' ')
      // 2. Clean parentheses & quotes so TTS doesn't read "วงเล็บเปิด...วงเล็บปิด" or "เครื่องหมายคำพูด"
      .replace(/\(([^)]+)\)/g, ', $1, ')
      .replace(/[()[\]{}"'“”‘’]/g, ' ')
      // 3. Strip all emojis, stickers, and pictographic symbols so TTS NEVER reads out symbol names
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}]/gu, '');

    // 4. Elongated vowels and repetitive Thai characters (ลากเสียงอย่างมี dynamic)
    // Reduce excessive ending repetitions (e.g. มากกกกก -> มากกก, จริงงงง -> จริงงง, อ่าาาาา -> อ่าาา) with breathing pause
    res = res.replace(/([ก-ฮ])\1{2,}/g, '$1$1$1')
      .replace(/า{3,}/g, 'าาา')
      .replace(/([ะัำิ-ูเ-ไ])\1{2,}/g, '$1$1')
      .replace(/(อ่า|เอิ่ม|เอ่อ|อือ|เย้|โอ้|ว้าว)\1+/g, '$1 ');

    // 5. Dynamic Thai Laughter: 5555 -> ฮ่าๆๆ with natural expressiveness
    // Detect sequences of 5s not followed by numeric measurement units (บาท, คน, ชิ้น, etc.)
    res = res.replace(/(?<!\d)(5{2,})(?:\+*)(?!\s*(?:บาท|ดอลลาร์|คน|ชิ้น|อัน|ตัว|กิโล|เมตร|วัน|ปี|เดือน|เท่า|พัน|หมื่น|แสน|ล้าน|\d))/g, (_match, fives) => {
      const len = fives.length;
      if (len === 2) return 'ฮ่าๆ ';
      if (len === 3) return 'ฮ่าๆๆ ';
      if (len <= 5) return 'ฮ่าๆๆๆ ';
      return 'ฮ่าาาๆๆๆๆ ';
    });

    // Handle single 55+ or 555+ standalone
    res = res.replace(/(?<!\d)5{2,}\+/g, 'ฮ่าๆๆๆ ');

    // Normalize repetitive "ฮ่าๆๆๆๆๆๆๆ" to lively dynamic laugh with breath
    res = res.replace(/(?:ฮ่า\s*){3,}/g, 'ฮ่าๆๆ ')
      .replace(/ฮ่าๆ{3,}/g, 'ฮ่าๆๆๆ ');

    // 6. Conversational Time & Units in Thai
    // 14:30 น. or 14:30 -> 14 นาฬิกา 30 นาที
    res = res.replace(/(\d{1,2}):(\d{2})\s*(?:น\.|น)?/g, (_m, h, min) => `${h} นาฬิกา ${min} นาที`)
      .replace(/(\d+(?:\.\d+)?)\s*°C/g, (_m, n) => `${n} องศาเซลเซียส`)
      .replace(/°C/g, ' องศาเซลเซียส')
      .replace(/(\d+(?:\.\d+)?)\s*km\/h/gi, (_m, n) => `${n} กิโลเมตรต่อชั่วโมง`)
      .replace(/km\/h/gi, ' กิโลเมตรต่อชั่วโมง')
      .replace(/(\d+(?:\.\d+)?)\s*%/g, (_m, n) => `${n} เปอร์เซ็นต์`);

    // 7. Tech & English loanwords to Thai Phonetics (อ่านคำศัพท์ได้แม่นยำ ไม่เพี้ยน)
    const phonetics: Array<[RegExp, string]> = [
      [/\b(?:Noar AI|noar ai|NoarAI|noarai|Noar|noar|Noah|noah)\b/gi, 'โนอา'],
      [/\b(?:Bo AI|bo ai|BoAI|boai)\b/gi, 'โบไอ'],
      [/\b(?:ChatGPT|chatgpt)\b/gi, 'แชทจีพีที'],
      [/\b(?:OpenAI|openai)\b/gi, 'โอเพนเอไอ'],
      [/\b(?:GPT-4o|gpt-4o|GPT4o)\b/gi, 'จีพีทีโฟร์โอ'],
      [/\b(?:GPT)\b/gi, 'จีพีที'],
      [/\b(?:Gemini)\b/gi, 'เจมิไน'],
      [/\b(?:Grok)\b/gi, 'กร็อก'],
      [/\b(?:Claude)\b/gi, 'โคลด'],
      [/\b(?:AI|ai)\b/g, 'เอไอ'],
      [/\b(?:YouTube Music|youtubemusic)\b/gi, 'ยูทูปมิวสิค'],
      [/\b(?:YouTube|youtube)\b/gi, 'ยูทูป'],
      [/\b(?:Google)\b/gi, 'กูเกิล'],
      [/\b(?:Facebook)\b/gi, 'เฟซบุ๊ก'],
      [/\b(?:WiFi|wifi)\b/gi, 'ไวไฟ'],
      [/\b(?:App|app)\b/g, 'แอป'],
      [/\b(?:Online|online)\b/gi, 'ออนไลน์'],
      [/\b(?:Offline|offline)\b/gi, 'ออฟไลน์'],
      [/\b(?:Admin|admin)\b/gi, 'แอดมิน'],
      [/\b(?:Playlist|playlist)\b/gi, 'เพลย์ลิสต์'],
      [/\b(?:Link|link)\b/gi, 'ลิงก์'],
      [/\b(?:Update|update)\b/gi, 'อัปเดต'],
      [/\b(?:ID|id)\b/g, 'ไอดี'],
      [/\b(?:URL|url)\b/g, 'ยูอาร์แอล'],
      [/\b(?:PDF|pdf)\b/g, 'พีดีเอฟ'],
      [/\b(?:MB|mb)\b/g, 'เมกะไบต์'],
      [/\b(?:GB|gb)\b/g, 'กิกะไบต์'],
      [/\b(?:KB|kb)\b/g, 'กิโลไบต์'],
      [/\b(?:ms)\b/g, 'มิลลิวินาที'],
      [/\b(?:API|api)\b/g, 'เอพีไอ'],
      [/\b(?:LLM|llm)\b/g, 'แอลแอลเอ็ม'],
      [/\b(?:Windows|windows)\b/gi, 'วินโดวส์'],
      [/\b(?:PC|pc)\b/g, 'พีซี'],
      [/\b(?:Mac|mac)\b/g, 'แมค'],
      [/\b(?:Bluetooth|bluetooth)\b/gi, 'บลูทูธ'],
      [/\b(?:Microphone|mic)\b/gi, 'ไมค์'],
      [/\b(?:Volume|volume)\b/gi, 'วอลลุ่ม'],
      [/\b(?:Browser|browser)\b/gi, 'เบราว์เซอร์'],
      [/\b(?:Calculator|calc)\b/gi, 'เครื่องคิดเลข'],
      [/\b(?:Notepad|notepad)\b/gi, 'โน้ตแพด'],
      [/\b(?:Task Manager|taskmgr)\b/gi, 'ทาสก์เมเนเจอร์'],
      [/\b(?:Desktop|desktop)\b/gi, 'เดสก์ท็อป'],
      [/\b(?:Mini Mode|mini mode)\b/gi, 'มินิโหมด'],
    ];

    for (const [regex, phonetic] of phonetics) {
      res = res.replace(regex, phonetic);
    }

    // 8. Natural Conversational Cadence & Breathing Pauses (จังหวะการพูดไม่กระชั้นชิด)
    // Insert subtle pause after particles so the voice breathes naturally
    res = res.replace(/(?<=(?:นะคะ|นะครับ|ค่ะ|ครับ|จ้า|จ๊ะ))\s*(?=[ก-ฮa-zA-Z])/g, ', ')
      .replace(/(?<=(?:สวัสดีค่ะ|สวัสดีครับ|ยินดีค่ะ|ยินดีครับ|ได้เลยค่ะ|ได้เลยครับ))\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    return res;
  }

  // Split Thai text into natural conversational chunks without cutting words
  public splitIntoNaturalThaiChunks(text: string, maxLen = 140): string[] {
    const cleaned = this.normalizeThaiTtsText(text);
    if (!cleaned) return [];

    // Split on natural breathing pauses and conversational boundaries
    const rawSegments = cleaned.split(/(?<=[.,!?\n]|นะคะ|นะครับ|แล้วนะ|เลยนะ|จ้า|ครับ|ค่ะ|เลย|แต่|และ)\s+/);
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
