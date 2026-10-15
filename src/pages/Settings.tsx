import React, { useState, useEffect } from 'react';
import { db } from '../services/db/databaseService';
import { AppSettings, LLMProvider } from '../types';
import {
  Key,
  Cpu,
  Volume2,
  Shield,
  RotateCcw,
  Save,
  Check,
  Eye,
  EyeOff,
  Download,
  Upload,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { audioService } from '../services/audio/audioService';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [showKey, setShowKey] = useState<{ [k: string]: boolean }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setSettings(db.getSettings());
  }, []);

  const handleSave = () => {
    db.saveSettings(settings);
    audioService.setWakeWords(settings.wake_word, settings.alternate_names, settings.sensitivity);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const toggleShowKey = (field: string) => {
    setShowKey({ ...showKey, [field]: !showKey[field] });
  };

  const handleExport = () => {
    const data = db.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boai_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = db.importAllData(content);
      if (success) {
        setSettings(db.getSettings());
        alert('นำเข้าข้อมูลและตั้งค่าสำเร็จ!');
      } else {
        alert('นำเข้าข้อมูลล้มเหลว กรุณาตรวจสอบไฟล์');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            การตั้งค่าระบบ (Settings)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            จัดการ API Key, เลือกรุ่น LLM, ปรับแต่งเสียงสังเคราะห์ TTS และระบบความเป็นส่วนตัว
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs shadow-md transition-all flex items-center gap-2"
        >
          {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
          {savedSuccess ? 'บันทึกสำเร็จแล้ว' : 'บันทึกการตั้งค่า'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: LLM Provider & API Keys */}
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">โมเดลประมวลผล (LLM Provider)</h2>
              <p className="text-[11px] text-slate-400">สลับค่าย AI ได้ตามต้องการ (ค่าเริ่มต้น: Claude)</p>
            </div>
          </div>

          {/* Provider Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">ผู้ให้บริการหลัก</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'claude', name: 'Claude (Anthropic)', desc: 'Sonnet 3.5' },
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4o' },
                { id: 'gemini', name: 'Google Gemini', desc: '1.5 Flash' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSettings({ ...settings, llm_provider: p.id as LLMProvider })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.llm_provider === p.id
                      ? 'bg-indigo-600/30 border-indigo-500/60 text-white shadow-sm'
                      : 'bg-surface-elevated/70 border-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">{p.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Claude API Key */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-300">Anthropic Claude API Key</label>
              <span className="text-[10px] text-indigo-400">โมเดลหลักที่เลือกไว้</span>
            </div>
            <div className="relative">
              <input
                type={showKey.claude ? 'text' : 'password'}
                value={settings.claude_api_key}
                onChange={(e) => setSettings({ ...settings, claude_api_key: e.target.value })}
                placeholder="sk-ant-api03-..."
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('claude')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showKey.claude ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">OpenAI API Key (สำรอง)</label>
            <div className="relative">
              <input
                type={showKey.openai ? 'text' : 'password'}
                value={settings.openai_api_key}
                onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                placeholder="sk-proj-..."
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('openai')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showKey.openai ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Google Gemini API Key (สำรอง)</label>
            <div className="relative">
              <input
                type={showKey.gemini ? 'text' : 'password'}
                value={settings.gemini_api_key}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-indigo-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('gemini')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showKey.gemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Speech, TTS & Voice Activity */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">การสังเคราะห์เสียง (Text-to-Speech)</h2>
                <p className="text-[11px] text-slate-400">ปรับความเร็วและโทนเสียงภาษาไทย</p>
              </div>
            </div>

            {/* TTS Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">ความเร็วเสียงพูด (Speed Rate)</span>
                <span className="font-mono text-cyan-400">{settings.tts_rate}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={settings.tts_rate}
                onChange={(e) => setSettings({ ...settings, tts_rate: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* TTS Pitch */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">ระดับเสียงสูง-ต่ำ (Pitch)</span>
                <span className="font-mono text-cyan-400">{settings.tts_pitch}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={settings.tts_pitch}
                onChange={(e) => setSettings({ ...settings, tts_pitch: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* VAD Timeout */}
            <div className="space-y-1 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Voice Activity Timeout (VAD)</span>
                <span className="font-mono text-indigo-400">{settings.vad_timeout_ms / 1000}s</span>
              </div>
              <input
                type="range"
                min="1500"
                max="5000"
                step="500"
                value={settings.vad_timeout_ms}
                onChange={(e) => setSettings({ ...settings, vad_timeout_ms: Number(e.target.value) })}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                ระยะเวลาที่รอเสียงเงียบก่อนจะถือว่าพูดจบคำสั่งและส่งไปประมวลผล
              </p>
            </div>
          </div>

          {/* Section 3: Privacy, Backup & System Auto-start */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">ความเป็นส่วนตัว & การสำรองข้อมูล</h2>
                <p className="text-[11px] text-slate-400">Privacy-First Architecture</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-white/[0.04]">
              <div>
                <p className="text-xs font-medium text-slate-200">เปิดแอปอัตโนมัติเมื่อเปิด Windows</p>
                <p className="text-[10px] text-slate-400">ทำงานใน System Tray เพื่อรอฟังคำสั่ง</p>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_start}
                onChange={(e) => setSettings({ ...settings, auto_start: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                สำรองข้อมูล (.json)
              </button>

              <label className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                นำเข้าข้อมูล
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              รีเซ็ตข้อมูลและคืนค่าโรงงาน (Factory Reset)
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-elevated p-6 rounded-2xl border border-rose-500/40 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">ต้องการล้างข้อมูลทั้งหมดหรือไม่?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              การดำเนินการนี้จะลบประวัติการสนทนา ความจำ และการตั้งค่าทั้งหมดในเครื่องและรีสตาร์ทแอปพลิเคชัน
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResetData}
                className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md"
              >
                ลบข้อมูลทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
