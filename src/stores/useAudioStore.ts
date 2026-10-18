import { create } from 'zustand';
import { AudioDevice } from '../types';
import { audioService } from '../services/audio/audioService';
import { db } from '../services/db/databaseService';

interface AudioStore {
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  selectedInputId: string;
  selectedOutputId: string;
  sensitivity: number;
  micLevel: number;
  isTestingMic: boolean;
  isTestingSpeaker: boolean;

  fetchDevices: () => Promise<void>;
  setSelectedInput: (id: string) => void;
  setSelectedOutput: (id: string) => void;
  setSensitivity: (val: number) => void;
  startMicTest: () => Promise<void>;
  stopMicTest: () => void;
  testSpeaker: () => Promise<void>;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  inputDevices: [],
  outputDevices: [],
  selectedInputId: 'default',
  selectedOutputId: 'default',
  sensitivity: 85,
  micLevel: 0,
  isTestingMic: false,
  isTestingSpeaker: false,

  fetchDevices: async () => {
    const inputs = await audioService.getInputDevices();
    const outputs = await audioService.getOutputDevices();
    const settings = db.getSettings();

    set({
      inputDevices: inputs,
      outputDevices: outputs,
      selectedInputId: settings.input_device_id || 'default',
      selectedOutputId: settings.output_device_id || 'default',
      sensitivity: settings.sensitivity || 85,
    });
  },

  setSelectedInput: (id: string) => {
    set({ selectedInputId: id });
    const settings = db.getSettings();
    settings.input_device_id = id;
    db.saveSettings(settings);
  },

  setSelectedOutput: (id: string) => {
    set({ selectedOutputId: id });
    const settings = db.getSettings();
    settings.output_device_id = id;
    db.saveSettings(settings);
  },

  setSensitivity: (val: number) => {
    set({ sensitivity: val });
    const settings = db.getSettings();
    settings.sensitivity = val;
    db.saveSettings(settings);
    audioService.setWakeWords(settings.wake_word, settings.alternate_names, val);
  },

  startMicTest: async () => {
    if (get().isTestingMic) return;
    set({ isTestingMic: true });
    await audioService.startMicrophoneMeter(get().selectedInputId);

    let lastLevel = -1;
    const interval = setInterval(() => {
      if (!get().isTestingMic) {
        clearInterval(interval);
        return;
      }
      const current = audioService.getMicrophoneLevel();
      if (Math.abs(current - lastLevel) >= 2) {
        lastLevel = current;
        set({ micLevel: current });
      }
    }, 100);
  },

  stopMicTest: () => {
    audioService.stopMicrophoneMeter();
    set({ isTestingMic: false, micLevel: 0 });
  },

  testSpeaker: async () => {
    set({ isTestingSpeaker: true });
    audioService.playChime('test');
    await audioService.speak('ทดสอบระบบเสียงลำโพงของโนอา เสียงใส ชัดเจน ระดับปกติค่ะ');
    set({ isTestingSpeaker: false });
  },
}));
