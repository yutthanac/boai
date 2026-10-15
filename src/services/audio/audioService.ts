import { AudioDevice } from '../../types';

export class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private micLevel = 0;
  private recognition: any = null;
  private isListeningForWakeWord = false;
  private wakeWordCallbacks: Array<() => void> = [];
  private currentWakeWord = 'น้องโบ';
  private alternateWakeWords: string[] = ['Bo AI', 'โบไอ'];
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
    this.currentWakeWord = primary.toLowerCase();
    this.alternateWakeWords = alternates.map(w => w.toLowerCase());
    this.sensitivity = sensitivity;
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

  // Wake Word Detection
  private initSpeechRecognition() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'th-TH';

      this.recognition.onresult = (event: any) => {
        if (!this.isListeningForWakeWord) return;
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript.trim().toLowerCase();

        const wordsToMatch = [this.currentWakeWord, ...this.alternateWakeWords];
        const match = wordsToMatch.some(w => transcript.includes(w));

        if (match) {
          this.playChime('wake');
          this.wakeWordCallbacks.forEach(cb => cb());
        }
      };

      this.recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e);
      };

      this.recognition.onend = () => {
        if (this.isListeningForWakeWord) {
          try {
            this.recognition.start();
          } catch (_) {}
        }
      };
    }
  }

  public startWakeWordDetection() {
    this.isListeningForWakeWord = true;
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (_) {}
    }
  }

  public stopWakeWordDetection() {
    this.isListeningForWakeWord = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  public onWakeWordDetected(callback: () => void) {
    this.wakeWordCallbacks.push(callback);
    return () => {
      this.wakeWordCallbacks = this.wakeWordCallbacks.filter(cb => cb !== callback);
    };
  }

  // Speech-to-Text for full command capture
  public listenForCommand(): Promise<string> {
    return new Promise((resolve) => {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        // Fallback simulated STT
        setTimeout(() => {
          resolve('น้องโบ วันนี้อากาศเป็นยังไงบ้าง');
        }, 2500);
        return;
      }

      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'th-TH';

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { rec.stop(); } catch (_) {}
          resolve('');
        }
      }, 6000);

      rec.onresult = (event: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          const transcript = event.results[0][0].transcript;
          resolve(transcript);
        }
      };

      rec.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve('');
        }
      };

      try {
        rec.start();
      } catch (e) {
        resolve('');
      }
    });
  }

  // Text-to-Speech (TTS)
  public speak(text: string, rate = 1.0, pitch = 1.0): Promise<void> {
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
