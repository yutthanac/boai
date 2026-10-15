import React, { useEffect, useState } from 'react';
import { useAudioStore } from '../stores/useAudioStore';
import { AudioLevelMeter } from '../components/AudioLevelMeter';
import {
  Mic,
  Volume2,
  Sliders,
  Play,
  Square,
  Radio,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { db } from '../services/db/databaseService';
import { audioService } from '../services/audio/audioService';
import { useAssistantStore } from '../stores/useAssistantStore';

export const VoiceDevices: React.FC = () => {
  const {
    inputDevices,
    outputDevices,
    selectedInputId,
    selectedOutputId,
    sensitivity,
    micLevel,
    isTestingMic,
    isTestingSpeaker,
    fetchDevices,
    setSelectedInput,
    setSelectedOutput,
    setSensitivity,
    startMicTest,
    stopMicTest,
    testSpeaker,
  } = useAudioStore();

  const [wakeWord, setWakeWord] = useState('น้องโบ');
  const [alternateNames, setAlternateNames] = useState<string[]>(['Bo AI', 'โบไอ']);
  const [newAltName, setNewAltName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchDevices();
    const settings = db.getSettings();
    setWakeWord(settings.wake_word || 'น้องโบ');
    setAlternateNames(settings.alternate_names || ['Bo AI', 'โบไอ']);

    return () => {
      stopMicTest();
    };
  }, []);

  const handleSaveWakeWords = () => {
    const settings = db.getSettings();
    const cleanPrimary = wakeWord.trim() || 'ไอ้โบ้';
    settings.wake_word = cleanPrimary;
    settings.alternate_names = alternateNames;
    db.saveSettings(settings);

    // Update live audio service listener immediately
    audioService.setWakeWords(cleanPrimary, alternateNames, settings.sensitivity);

    // Update status text on title bar and home
    useAssistantStore.getState().setStatusText(`พร้อมรับฟัง (เรียก "${cleanPrimary}")`);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const addAlternateName = () => {
    if (!newAltName.trim() || alternateNames.length >= 3) return;
    setAlternateNames([...alternateNames, newAltName.trim()]);
    setNewAltName('');
  };

  const removeAlternateName = (index: number) => {
    setAlternateNames(alternateNames.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            ระบบเสียง & อุปกรณ์ (Voice & Devices)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            ตั้งค่าไมโครโฟน, ลำโพง, ชื่อเรียก Wake Word และทดสอบระดับเสียงแบบเรียลไทม์
          </p>
        </div>

        <button
          onClick={() => fetchDevices()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          รีเฟรชอุปกรณ์
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Selection & Testing */}
        <div className="space-y-6">
          {/* Microphone Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">ไมโครโฟน (Input Device)</h2>
                  <p className="text-[11px] text-slate-400">อุปกรณ์รับเสียงหลักสำหรับคำสั่ง</p>
                </div>
              </div>

              <button
                onClick={isTestingMic ? stopMicTest : startMicTest}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isTestingMic
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40'
                }`}
              >
                {isTestingMic ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isTestingMic ? 'หยุดทดสอบ' : 'ทดสอบไมค์สด'}
              </button>
            </div>

            <select
              value={selectedInputId}
              onChange={(e) => setSelectedInput(e.target.value)}
              className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              {inputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Default Microphone'}
                </option>
              ))}
            </select>

            {/* Realtime Mic Visualizer */}
            <AudioLevelMeter
              level={micLevel}
              threshold={sensitivity}
              isTesting={isTestingMic}
            />
          </div>

          {/* Speaker Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">ลำโพง (Output Device)</h2>
                  <p className="text-[11px] text-slate-400">อุปกรณ์ขับเสียงพูดตอบกลับ TTS</p>
                </div>
              </div>

              <button
                onClick={testSpeaker}
                disabled={isTestingSpeaker}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isTestingSpeaker
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40'
                }`}
              >
                <Play className="w-3 h-3" />
                {isTestingSpeaker ? 'กำลังเล่นเสียง...' : 'ทดสอบลำโพง'}
              </button>
            </div>

            <select
              value={selectedOutputId}
              onChange={(e) => setSelectedOutput(e.target.value)}
              className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
            >
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Default Speaker'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Wake Word & Sensitivity Settings */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-800 p-1 border border-white/10 flex items-center justify-center shrink-0">
                  <img src="/assets/images/dog.png" alt="" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Wake Word Detection</h2>
                  <p className="text-[11px] text-slate-400">คำเรียกหลักและชื่อเรียกสำรอง</p>
                </div>
              </div>

              {savedSuccess && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> บันทึกแล้ว
                </span>
              )}
            </div>

            {/* Primary Wake Word */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                ชื่อเรียกหลัก (Primary Wake Word)
              </label>
              <input
                type="text"
                value={wakeWord}
                onChange={(e) => setWakeWord(e.target.value)}
                placeholder="เช่น น้องโบ, Bo AI"
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>

            {/* Alternate Wake Words */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  ชื่อเรียกสำรอง (สูงสุด 3 ชื่อ)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {alternateNames.length}/3
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {alternateNames.map((alt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-white/10 text-xs text-slate-200"
                  >
                    <span>"{alt}"</span>
                    <button
                      onClick={() => removeAlternateName(idx)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {alternateNames.length < 3 && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newAltName}
                    onChange={(e) => setNewAltName(e.target.value)}
                    placeholder="เพิ่มชื่อเรียกสำรอง..."
                    className="flex-1 bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={addAlternateName}
                    disabled={!newAltName.trim()}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-200 border border-white/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sensitivity Slider */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">ความไวการตรวจจับ (Sensitivity)</span>
                <span className="font-mono text-cyan-400 font-semibold">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                ค่าที่แนะนำ: 70–80% (หากมีเสียงรบกวนรอบข้างให้ปรับลดลง เพื่อป้องกันการตอบสนองผิดพลาด)
              </p>
            </div>

            <button
              onClick={handleSaveWakeWords}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              บันทึกการตั้งค่าคำเรียกเสียง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
