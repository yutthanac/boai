import React, { useState, useEffect } from 'react';
import { db } from '../services/db/databaseService';
import { AppSettings, LLMProvider, StorageUsageInfo } from '../types';
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
  HelpCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Sun,
  Moon,
  Palette,
  HardDrive,
  Database,
  Trash2,
  RefreshCw,
  MessageSquare,
  Calendar,
  Send,
  Copy
} from 'lucide-react';
import { audioService } from '../services/audio/audioService';
import { aiService } from '../services/ai/aiService';
import { lineService } from '../services/line/lineService';
import { useAssistantStore } from '../stores/useAssistantStore';

export const Settings: React.FC = () => {
  const theme = useAssistantStore((s) => s.theme);
  const setTheme = useAssistantStore((s) => s.setTheme);
  const grokQuota = useAssistantStore((s) => s.grokQuota);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [showKey, setShowKey] = useState<{ [k: string]: boolean }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isTestingTts, setIsTestingTts] = useState(false);
  const [ttsFeedback, setTtsFeedback] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<{ provider: string; success: boolean; message: string; model?: string } | null>(null);

  // Storage & Quota Management State
  const [storageInfo, setStorageInfo] = useState<StorageUsageInfo | null>(null);
  const [isClearingStorage, setIsClearingStorage] = useState(false);
  const [storageFeedback, setStorageFeedback] = useState<string | null>(null);
  const [confirmClearType, setConfirmClearType] = useState<'chat' | 'reminders' | 'cache' | 'all' | null>(null);

  const refreshStorageInfo = async () => {
    try {
      const info = await db.getStorageUsageInfo();
      setStorageInfo(info);
    } catch (e) {
      console.warn('Failed to fetch storage info:', e);
    }
  };

  useEffect(() => {
    setSettings(db.getSettings());
    refreshStorageInfo();

    const handleStorageUpdate = () => {
      refreshStorageInfo();
    };
    window.addEventListener('noar-storage-updated', handleStorageUpdate);
    window.addEventListener('noar-reminders-updated', handleStorageUpdate);

    if (typeof window !== 'undefined' && (window as any).electronAPI?.getLineWebhookInfo) {
      (window as any).electronAPI.getLineWebhookInfo().then((info: any) => {
        if (info) setWebhookInfo(info);
      }).catch(() => {});
    }

    const handleLineUserSync = (e: any) => {
      if (e.detail?.userId) {
        setSettings((prev) => ({ ...prev, line_user_id: e.detail.userId }));
      }
    };
    window.addEventListener('noar-line-user-updated', handleLineUserSync);

    return () => {
      window.removeEventListener('noar-storage-updated', handleStorageUpdate);
      window.removeEventListener('noar-reminders-updated', handleStorageUpdate);
      window.removeEventListener('noar-line-user-updated', handleLineUserSync);
    };
  }, []);

  // LINE Official Account & Webhook State
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isTestingLine, setIsTestingLine] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<{ port: number; endpoint: string; running: boolean } | null>(null);

  const handleCopyWebhookUrl = () => {
    const port = webhookInfo?.port || settings.line_webhook_port || 3000;
    const url = `http://localhost:${port}/api/line/webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleTestLineSchedule = async () => {
    setIsTestingLine(true);
    setLineTestResult(null);
    try {
      db.saveSettings(settings);
      const res = await lineService.sendScheduleToLine('วันนี้');
      setLineTestResult({ success: res.success, message: res.message });
      setTimeout(() => setLineTestResult(null), 8000);
    } catch (e: any) {
      setLineTestResult({ success: false, message: e?.message || 'ส่งข้อความเข้า LINE ล้มเหลว' });
      setTimeout(() => setLineTestResult(null), 8000);
    } finally {
      setIsTestingLine(false);
    }
  };

  const handleChangeMaxStorage = (gb: number) => {
    db.setMaxStorageLimit(gb);
    setSettings((prev) => ({ ...prev, max_storage_gb: gb }));
    refreshStorageInfo();
    setStorageFeedback(`กำหนดขีดจำกัดความจุสูงสุดเป็น ${gb} GB เรียบร้อยแล้วค่ะ 💾`);
    setTimeout(() => setStorageFeedback(null), 3000);
  };

  const handleExecuteClear = async (type: 'chat' | 'reminders' | 'cache' | 'all') => {
    setIsClearingStorage(true);
    try {
      if (type === 'chat') {
        db.clearChatStorage();
        setStorageFeedback('เคลียร์ประวัติการสนทนาทั้งหมดเรียบร้อยแล้วค่ะ 🧹');
      } else if (type === 'reminders') {
        db.clearRemindersStorage();
        setStorageFeedback('เคลียร์รายการแจ้งเตือนและตารางงานเรียบร้อยแล้วค่ะ ⏰');
      } else if (type === 'cache') {
        await db.clearCacheStorage();
        setStorageFeedback('ล้างแคชระบบและบันทึกชั่วคราวเรียบร้อยแล้วค่ะ ⚡');
      } else if (type === 'all') {
        await db.clearAllStorage(true);
        setStorageFeedback('ล้างข้อมูลใน Storage ทั้งหมดเรียบร้อยแล้ว (ยังคงเก็บ API Keys ไว้) ✨');
      }
      await refreshStorageInfo();
    } catch (err: any) {
      setStorageFeedback(`เกิดข้อผิดพลาดในการเคลียร์: ${err?.message || 'Error'}`);
    } finally {
      setIsClearingStorage(false);
      setConfirmClearType(null);
      setTimeout(() => setStorageFeedback(null), 4000);
    }
  };

  const handleTestApi = async (provider: LLMProvider) => {
    setIsTestingApi(provider);
    setApiTestResult(null);
    db.saveSettings(settings);
    const res = await aiService.testProviderConnection(provider);
    setApiTestResult({ provider, ...res });
    setSettings(db.getSettings());
    setIsTestingApi(null);
  };

  const handleTestTts = async () => {
    setIsTestingTts(true);
    setTtsFeedback(null);
    db.saveSettings(settings);

    if (settings.tts_engine === 'openai' && !settings.openai_api_key) {
      setTtsFeedback('💡 ยังไม่ได้ใส่ OpenAI API Key หรือเครดิตหมด ระบบจะใช้เสียงธรรมชาติฟรีแทน');
    } else if (settings.tts_engine === 'grok' && !settings.grok_api_key) {
      setTtsFeedback('💡 ยังไม่ได้ใส่ xAI Grok API Key ระบบจะใช้เสียงธรรมชาติฟรีแทน');
    }

    try {
      await audioService.speak('สวัสดีค่ะ โนอาพร้อมรับคำสั่งแล้วนะคะ มีเรื่องอะไรให้โนอาช่วยบอกมาได้เลยค่ะ', settings.tts_rate, settings.tts_pitch);
    } catch (e: any) {
      setTtsFeedback(`เกิดข้อผิดพลาด: ${e?.message || 'Error'}`);
    } finally {
      setIsTestingTts(false);
    }
  };

  const handleApplyGrokFreePreset = () => {
    audioService.applyGrokFreePreset();
    setSettings(db.getSettings());
    alert('⚡ เปิดใช้งานพรีเซ็ตเสียง & สำเนียงสไตล์ Grok เรียบร้อยแล้ว! (ฟรี 100% ไม่ต้องใช้ API Key โดยปรับสปีด 1.25x และเพิ่มความฉลาด/กวน)');
  };

  const handleSave = () => {
    db.saveSettings(settings);
    audioService.setWakeWords(settings.wake_word, settings.alternate_names, settings.sensitivity);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.setAutoStart) {
      (window as any).electronAPI.setAutoStart(settings.auto_start);
    }
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
              <p className="text-[11px] text-slate-400">สลับค่าย AI ได้ตามต้องการ (แนะนำ: Google Gemini ใช้งานฟรี)</p>
            </div>
          </div>

          {/* Provider Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">ผู้ให้บริการหลัก (LLM Provider)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { id: 'gemini', name: 'Google Gemini', desc: 'Flash Lite / 3.5 (ฟรี แนะนำ)', badge: 'ฟรี แนะนำ' },
                { id: 'grok', name: 'xAI Grok', desc: 'Grok-2 / Grok Beta (ฉลาด ลึกซึ้ง)', badge: 'ถามตอบลึกซึ้ง' },
                { id: 'meta', name: 'Meta Llama', desc: 'Llama 3.3 70B (Groq เร็วมาก)', badge: 'โอเพนซอร์ส' },
                { id: 'openai', name: 'OpenAI', desc: 'GPT-4o / GPT-4o-mini', badge: 'มาตรฐาน' },
                { id: 'claude', name: 'Claude', desc: 'Sonnet 3.5 / Haiku', badge: 'วิเคราะห์คม' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSettings({ ...settings, llm_provider: p.id as LLMProvider })}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    settings.llm_provider === p.id
                      ? 'bg-indigo-600/30 border-indigo-500/60 text-white shadow-sm ring-1 ring-indigo-500/40'
                      : 'bg-surface-elevated/70 border-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{p.name}</p>
                    {p.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2 pt-2 rounded-xl p-3 bg-surface-elevated/50 border border-white/[0.04]">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-slate-200">Google Gemini API Key</label>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-medium">ฟรี แนะนำ</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestApi('gemini')}
                disabled={isTestingApi === 'gemini'}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-[10px] flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {isTestingApi === 'gemini' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-indigo-400" />
                )}
                ทดสอบเชื่อมต่อ
              </button>
            </div>

            {/* Test result feedback banner */}
            {apiTestResult?.provider === 'gemini' && (
              <div className={`p-2 rounded-lg text-xs flex items-start gap-2 border ${
                apiTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {apiTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[11px]">
                    {apiTestResult.success ? `เชื่อมต่อสำเร็จ! (โมเดล: ${apiTestResult.model || settings.gemini_model})` : 'การเชื่อมต่อล้มเหลว'}
                  </div>
                  <div className="text-[10px] opacity-85 mt-0.5 leading-relaxed">{apiTestResult.message}</div>
                </div>
              </div>
            )}

            <div className="relative">
              <input
                type={showKey.gemini ? 'text' : 'password'}
                value={settings.gemini_api_key}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                placeholder="AQ.Ab8... หรือ AIzaSy..."
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
            <p className="text-[10px] text-slate-400 leading-relaxed">
              รองรับทั้ง Auth Key แบบใหม่ของ Google AI Studio (<code className="text-cyan-400">AQ...</code>) และคีย์ดั้งเดิม (<code className="text-slate-300">AIzaSy...</code>)
            </p>
          </div>

          {/* Grok (xAI) API Key & Quota Monitor */}
          <div className="space-y-2 rounded-xl p-3 bg-surface-elevated/50 border border-white/[0.04]">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-slate-200">xAI Grok API Key</label>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 font-medium">ลึกซึ้ง & มีไหวพริบ</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestApi('grok')}
                disabled={isTestingApi === 'grok'}
                className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 text-[10px] flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {isTestingApi === 'grok' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-purple-400" />
                )}
                ทดสอบเชื่อมต่อ
              </button>
            </div>

            {/* Test result feedback banner */}
            {apiTestResult?.provider === 'grok' && (
              <div className={`p-2 rounded-lg text-xs flex items-start gap-2 border ${
                apiTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {apiTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[11px]">
                    {apiTestResult.success ? `เชื่อมต่อสำเร็จ! (โมเดล: ${apiTestResult.model || settings.grok_model})` : 'การเชื่อมต่อล้มเหลว'}
                  </div>
                  <div className="text-[10px] opacity-85 mt-0.5 leading-relaxed">{apiTestResult.message}</div>
                </div>
              </div>
            )}
            <div className="relative">
              <input
                type={showKey.grok ? 'text' : 'password'}
                value={settings.grok_api_key || ''}
                onChange={(e) => setSettings({ ...settings, grok_api_key: e.target.value })}
                placeholder="xai-..."
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('grok')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showKey.grok ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Grok Model Selector */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-slate-400">เลือกรุ่นโมเดล Grok:</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'grok-2-latest', label: 'Grok-2 Latest' },
                  { id: 'grok-2', label: 'Grok-2' },
                  { id: 'grok-beta', label: 'Grok Beta' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, grok_model: m.id })}
                    className={`px-2 py-0.5 rounded-md text-[10px] border transition-all ${
                      (settings.grok_model || 'grok-2-latest') === m.id
                        ? 'bg-purple-500/20 border-purple-400/60 text-purple-300 font-medium'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grok Live Quota / Rate-limit Status Card */}
            <div className="mt-2 p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/20 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    grokQuota?.status === 'exhausted'
                      ? 'bg-rose-500 animate-ping'
                      : grokQuota?.status === 'near_limit'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`} />
                  สถานะข้อจำกัด & โควต้าของ Grok:
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                  grokQuota?.status === 'exhausted'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : grokQuota?.status === 'near_limit'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {grokQuota?.status === 'exhausted'
                    ? 'โควต้าหมด (Auto-Fallback)'
                    : grokQuota?.status === 'near_limit'
                    ? 'ใกล้หมด'
                    : 'พร้อมใช้งาน'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                <div>
                  คำขอที่เหลือ: <span className="font-mono text-purple-300 font-semibold">{grokQuota?.remainingRequests ?? 'ตรวจจับตอนเรียก'}</span>
                  {grokQuota?.limitRequests && ` / ${grokQuota.limitRequests}`}
                </div>
                <div>
                  เวลา Reset: <span className="font-mono text-slate-300">{grokQuota?.resetTime ? `${grokQuota.resetTime}s` : 'อัตโนมัติ'}</span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 italic">
                * หากข้อจำกัดของ Grok หมด ระบบจะแจ้งเตือนและสลับไปตอบด้วยโมเดลสำรอง (Gemini) ให้อัตโนมัติทันที
              </p>
            </div>
          </div>

          {/* Groq LPU / Meta API Key & Settings */}
          <div className="space-y-2 rounded-xl p-3 bg-surface-elevated/50 border border-white/[0.04]">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <label className="font-medium text-slate-200">Groq LPU / Meta Key</label>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 font-medium">เร็วสูงสุด ~300 T/s</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestApi('meta')}
                disabled={isTestingApi === 'meta'}
                className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-[10px] flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {isTestingApi === 'meta' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-blue-400" />
                )}
                ทดสอบเชื่อมต่อ
              </button>
            </div>

            {/* Test result feedback banner */}
            {apiTestResult?.provider === 'meta' && (
              <div className={`p-2 rounded-lg text-xs flex items-start gap-2 border ${
                apiTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {apiTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[11px]">
                    {apiTestResult.success ? `เชื่อมต่อสำเร็จ! (โมเดล: ${apiTestResult.model || settings.meta_model})` : 'การเชื่อมต่อล้มเหลว'}
                  </div>
                  <div className="text-[10px] opacity-85 mt-0.5 leading-relaxed">{apiTestResult.message}</div>
                </div>
              </div>
            )}

            {/* Provider Switch: Groq vs OpenRouter */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, meta_provider: 'groq' })}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] border transition-all ${
                  (settings.meta_provider || 'groq') === 'groq'
                    ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 font-medium'
                    : 'bg-white/[0.02] border-white/[0.04] text-slate-400'
                }`}
              >
                Groq API (ชิป LPU เร็วพิเศษ ~300 T/s)
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, meta_provider: 'openrouter' })}
                className={`flex-1 py-1 px-2 rounded-lg text-[10px] border transition-all ${
                  settings.meta_provider === 'openrouter'
                    ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 font-medium'
                    : 'bg-white/[0.02] border-white/[0.04] text-slate-400'
                }`}
              >
                OpenRouter API
              </button>
            </div>

            <div className="relative">
              <input
                type={showKey.meta ? 'text' : 'password'}
                value={settings.meta_api_key || ''}
                onChange={(e) => setSettings({ ...settings, meta_api_key: e.target.value })}
                placeholder={settings.meta_provider === 'openrouter' ? 'sk-or-v1-...' : 'gsk_...'}
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-blue-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('meta')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showKey.meta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Meta Model Selector */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">เลือกรุ่นโมเดลที่ต้องการ:</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {settings.meta_model || 'openai/gpt-oss-120b'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B ★ แนะนำ (ฉลาด & เร็วมาก)' },
                  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (เร็วพิเศษ)' },
                  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
                  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
                  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, meta_model: m.id })}
                    className={`px-2 py-0.5 rounded-md text-[10px] border transition-all ${
                      (settings.meta_model || 'openai/gpt-oss-120b') === m.id
                        ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 font-medium'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
              💡 <span className="text-slate-300 font-medium">หมายเหตุ:</span> Groq ได้เปิดให้ใช้งาน <code className="text-cyan-400">openai/gpt-oss-120b</code> และ <code className="text-cyan-400">openai/gpt-oss-20b</code> เป็นโมเดลหลักบนชิป LPU ประมวลผลภาษาไทยได้ดีเยี่ยมและรวดเร็วมาก หากโมเดลใดปิดให้บริการ ระบบจะ Auto-Fallback สลับโมเดลที่ใช้งานได้ให้อัตโนมัติทันที
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2 rounded-xl p-3 bg-surface-elevated/50 border border-white/[0.04]">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-200">OpenAI API Key (ChatGPT / TTS)</label>
              <button
                type="button"
                onClick={() => handleTestApi('openai')}
                disabled={isTestingApi === 'openai'}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[10px] flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {isTestingApi === 'openai' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-slate-400" />
                )}
                ทดสอบเชื่อมต่อ
              </button>
            </div>
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

          {/* Claude API Key */}
          <div className="space-y-2 rounded-xl p-3 bg-surface-elevated/50 border border-white/[0.04]">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-200">Anthropic Claude API Key</label>
              <button
                type="button"
                onClick={() => handleTestApi('claude')}
                disabled={isTestingApi === 'claude'}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[10px] flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {isTestingApi === 'claude' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-slate-400" />
                )}
                ทดสอบเชื่อมต่อ
              </button>
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

          {/* Test API Result Banner */}
          {apiTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in transition-all ${
                apiTestResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {apiTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1 overflow-hidden">
                <p className="font-semibold text-[11px]">
                  {apiTestResult.success
                    ? `เชื่อมต่อ ${apiTestResult.provider.toUpperCase()} (${apiTestResult.model}) สำเร็จ!`
                    : `การเชื่อมต่อ ${apiTestResult.provider.toUpperCase()} ล้มเหลว`}
                </p>
                <p className="text-[10px] text-slate-300 line-clamp-2">
                  {apiTestResult.message}
                </p>
              </div>
            </div>
          )}
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

            {/* Thai Natural Voice & ChatGPT Speech Engine Callout */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/30 border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  ใหม่! Smart Thai Natural Speech Pipeline
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                🎯 <strong>อ่านภาษาไทยแม่นยำ & จังหวะธรรมชาติ:</strong> แปลงพิมพ์ <strong>"5555"</strong> หรือ <strong>"555+"</strong> เป็นเสียงหัวเราะ <strong>"ฮ่าๆๆ"</strong> แบบมีไดนามิกและจังหวะหายใจอย่างเป็นธรรมชาติ, รองรับการลากเสียงคำไทย (เช่น อ่าาา, มากกก), ออกเสียงคำทับศัพท์ไอทีและภาษาอังกฤษถูกต้อง 100%, และสามารถเลือกเสียง <strong>ChatGPT Voice (Nova / Shimmer)</strong> ผ่าน OpenAI TTS ได้ทันที
              </p>
            </div>

            {/* Grok Style Free Preset Callout (No API Key Required) */}
            <div className="p-3 rounded-xl bg-purple-950/25 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-purple-200">⚡ อยากได้เสียง & จังหวะการพูดสไตล์ Grok ฟรี?</span>
                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-purple-500/30 text-purple-300 font-bold">100% ฟรี</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  ปรับสปีด 1.25x (ฉะฉาน) + ปรับคาแรกเตอร์กระชับ ฉลาด และกวนนิดๆ สไตล์ Grok โดยไม่ต้องใช้ API Key
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyGrokFreePreset}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-sm transition-all whitespace-nowrap shrink-0"
              >
                เปิดใช้สไตล์ Grok ฟรี
              </button>
            </div>

            {/* TTS Engine Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">เครื่องยนต์เสียง (TTS Engine)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, tts_engine: 'natural_female' })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.tts_engine === 'natural_female' || !settings.tts_engine
                      ? 'bg-cyan-600/30 border-cyan-500/60 text-white shadow-sm'
                      : 'bg-surface-elevated/70 border-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">เสียงธรรมชาติ</p>
                  <p className="text-[10px] text-cyan-300 mt-0.5">คมชัด ลื่นไหล (ฟรี)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, tts_engine: 'grok' })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.tts_engine === 'grok'
                      ? 'bg-purple-600/30 border-purple-500/60 text-white shadow-sm'
                      : 'bg-surface-elevated/70 border-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold">Grok Voice</p>
                    <span className="px-1 py-0.2 rounded text-[8px] bg-purple-500/20 text-purple-300 font-bold">xAI Key</span>
                  </div>
                  <p className="text-[10px] text-purple-300 mt-0.5">เสียงแท้ xAI Grok</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, tts_engine: 'openai' })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.tts_engine === 'openai'
                      ? 'bg-cyan-600/30 border-cyan-500/60 text-white shadow-sm'
                      : 'bg-surface-elevated/70 border-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">OpenAI TTS</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">ChatGPT Voice</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, tts_engine: 'browser' })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.tts_engine === 'browser'
                      ? 'bg-cyan-600/30 border-cyan-500/60 text-white shadow-sm'
                      : 'bg-surface-elevated/70 border-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">Web Speech</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">เสียงเครื่องออฟไลน์</p>
                </button>
              </div>
            </div>

            {/* Grok Voice Options (When Grok engine is selected) */}
            {settings.tts_engine === 'grok' && (
              <div className="p-3 rounded-xl bg-surface-elevated border border-purple-500/30 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-medium text-slate-200">เลือกเสียง Grok (xAI Voice)</label>
                    <span className="text-[10px] text-purple-400 font-mono">
                      xAI /v1/tts
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: 'leo', name: 'Leo', desc: 'ชาย สุขุม ชัดเจน มั่นใจ' },
                      { id: 'rex', name: 'Rex', desc: 'ชาย พลังเยอะ กระฉับกระเฉง' },
                      { id: 'ara', name: 'Ara', desc: 'หญิง อบอุ่น มีเสน่ห์' },
                      { id: 'eve', name: 'Eve', desc: 'หญิง ฉะฉาน เป็นมิตร' },
                      { id: 'sal', name: 'Sal', desc: 'กลางๆ ชัดถ้อยชัดคำ' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, grok_tts_voice: v.id as any })}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          (settings.grok_tts_voice || 'leo') === v.id
                            ? 'bg-purple-500/20 border-purple-400/50 text-white'
                            : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <p className="text-xs font-medium">{v.name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400">
                  * จะใช้ xAI Grok API Key ที่ระบุในกล่อง xAI Grok ด้านซ้ายเพื่อดึงเสียงแท้จาก xAI (รองรับเสียงแท้จากเซิร์ฟเวอร์ xAI ตรง หากพูดไทยจะเป็นสไตล์อินเตอร์ของ Grok)
                </p>
              </div>
            )}

            {/* OpenAI Voice Options (When OpenAI engine is selected) */}
            {settings.tts_engine === 'openai' && (
              <div className="p-3 rounded-xl bg-surface-elevated border border-cyan-500/20 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-medium text-slate-200">เลือกเสียงธรรมชาติ (ChatGPT Voice)</label>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      ใช้โมเดล: {settings.openai_tts_model || 'tts-1-hd'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'nova', name: 'Nova', desc: 'หญิง สดใสธรรมชาติ (แนะนำ)' },
                      { id: 'shimmer', name: 'Shimmer', desc: 'หญิง นุ่มนวล อ่อนหวาน' },
                      { id: 'alloy', name: 'Alloy', desc: 'กลางๆ ชัดเจน สุภาพ' },
                      { id: 'echo', name: 'Echo', desc: 'ชาย อบอุ่น เป็นมิตร' },
                      { id: 'onyx', name: 'Onyx', desc: 'ชาย ทุ้มลึก สุขุม' },
                      { id: 'fable', name: 'Fable', desc: 'เสียงนิทาน มีชีวิตชีวา' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, openai_tts_voice: v.id as any })}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          settings.openai_tts_voice === v.id
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-white'
                            : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <p className="text-xs font-medium">{v.name}</p>
                        <p className="text-[9px] text-slate-500 truncate">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-slate-200">ความละเอียดโมเดลเสียง</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, openai_tts_model: 'tts-1-hd' })}
                      className={`p-1.5 rounded-lg border text-xs text-center transition-all ${
                        settings.openai_tts_model === 'tts-1-hd'
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-medium'
                          : 'bg-white/[0.02] border-white/[0.04] text-slate-400'
                      }`}
                    >
                      tts-1-hd (ความชัดสูงสุด)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, openai_tts_model: 'tts-1' })}
                      className={`p-1.5 rounded-lg border text-xs text-center transition-all ${
                        settings.openai_tts_model === 'tts-1'
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-medium'
                          : 'bg-white/[0.02] border-white/[0.04] text-slate-400'
                      }`}
                    >
                      tts-1 (ตอบสนองไว)
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400">
                  * จะใช้ OpenAI API Key ที่ระบุในกล่องด้านซ้ายเพื่อดึงเสียง ChatGPT TTS
                </p>
              </div>
            )}

            {/* Test Voice Button */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleTestTts}
                disabled={isTestingTts}
                className="w-full py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-all flex items-center justify-center gap-2"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {isTestingTts ? 'กำลังเล่นเสียงตัวอย่าง...' : 'ทดลองฟังเสียงสังเคราะห์ (Test Audio)'}
              </button>
              {ttsFeedback && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{ttsFeedback}</span>
                </div>
              )}
            </div>

            {/* TTS Speed */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">ความเร็วเสียงพูด (Speech Speed)</span>
                <span className="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-semibold">{settings.tts_rate}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.8"
                step="0.05"
                value={settings.tts_rate}
                onChange={(e) => setSettings({ ...settings, tts_rate: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { rate: 1.0, label: '1.0x ช้า' },
                  { rate: 1.2, label: '1.2x ธรรมชาติ' },
                  { rate: 1.35, label: '1.35x คล่อง' },
                  { rate: 1.5, label: '1.5x ไว' },
                ].map((preset) => (
                  <button
                    key={preset.rate}
                    type="button"
                    onClick={() => setSettings({ ...settings, tts_rate: preset.rate })}
                    className={`py-1 rounded-lg text-[10px] border transition-all ${
                      Math.abs(settings.tts_rate - preset.rate) < 0.03
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-medium shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
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

          {/* Section 2.5: Theme Selection (ธีมสว่าง / ธีมมืด) */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">ธีมหน้าจอ (Appearance & Theme)</h2>
                <p className="text-[11px] text-slate-400">เลือกระหว่างธีมมืด (Dark) สบายตา หรือธีมสว่าง (Light) สดใส</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  setSettings({ ...settings, theme: 'dark' });
                }}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  theme === 'dark'
                    ? 'bg-indigo-600/25 border-indigo-500/60 text-white shadow-md'
                    : 'bg-surface-elevated/70 border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">ธีมมืด (Dark Theme)</p>
                  <p className="text-[10px] text-slate-400">พื้นหลังสีอวกาศ สบายตา</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  setSettings({ ...settings, theme: 'light' });
                }}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  theme === 'light'
                    ? 'bg-amber-500/20 border-amber-400/60 text-slate-900 shadow-md'
                    : 'bg-surface-elevated/70 border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-amber-400/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">ธีมสว่าง (Light Theme)</p>
                  <p className="text-[10px] text-slate-400">พื้นหลังสีขาวคลีน สบายตา</p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2.7: LINE Official Account & Webhook Integration */}
          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">LINE Official Account & Chatbot Webhook</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Webhook Active (Port {webhookInfo?.port || settings.line_webhook_port || 3000})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">ส่งการแจ้งเตือนตารางงานเข้า LINE เมื่อสั่ง "ช่วยส่งตารางของวันนี้ไปที่ไลน์ให้หน่อย" หรือระบุวันที่</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestLineSchedule}
                disabled={isTestingLine}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isTestingLine ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-emerald-400" />}
                <span>ทดสอบส่งตารางงานเข้า LINE</span>
              </button>
            </div>

            {/* Test result feedback banner */}
            {lineTestResult && (
              <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                lineTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {lineTestResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[11px]">
                    {lineTestResult.success ? 'ส่งข้อความเข้า LINE สำเร็จ!' : 'การส่งข้อความล้มเหลว'}
                  </div>
                  <div className="text-[10px] opacity-90 mt-0.5 leading-relaxed">{lineTestResult.message}</div>
                </div>
              </div>
            )}

            {/* Webhook URL Endpoint Box */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/80 border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300">Webhook URL Endpoint สำหรับกรอกใน LINE Console</label>
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  {copiedWebhook ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedWebhook ? 'คัดลอกเรียบร้อย!' : 'คัดลอก URL'}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`http://localhost:${webhookInfo?.port || settings.line_webhook_port || 3000}/api/line/webhook`}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
                ใส่ใน <strong className="text-slate-300">LINE Developers Console</strong> &gt; แท็บ Messaging API &gt; Webhook settings &gt; เปิด <strong className="text-emerald-400">Use webhook</strong> (หากต้องการทดสอบบนอินเทอร์เน็ต ใช้ Tunnel เช่น <code className="text-cyan-300 font-mono">ngrok http {webhookInfo?.port || settings.line_webhook_port || 3000}</code>)
              </p>
            </div>

            {/* Keys Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Channel Secret */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">LINE Channel Secret (32 หลัก)</label>
                <div className="relative">
                  <input
                    type={showKey.line_secret ? 'text' : 'password'}
                    value={settings.line_channel_secret || ''}
                    onChange={(e) => setSettings({ ...settings, line_channel_secret: e.target.value })}
                    placeholder="71ff04a0ec6aa3923cdc447ae7331589"
                    className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('line_secret')}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showKey.line_secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Channel Access Token */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Channel Access Token (Long-lived)</label>
                <div className="relative">
                  <input
                    type={showKey.line_token ? 'text' : 'password'}
                    value={settings.line_channel_access_token || ''}
                    onChange={(e) => setSettings({ ...settings, line_channel_access_token: e.target.value })}
                    placeholder="กด Issue ในแท็บ Messaging API ของ LINE Console"
                    className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('line_token')}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showKey.line_token ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Connected LINE User ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300">Connected LINE User ID (ผู้รับตารางงาน)</label>
                <span className="text-[10px] text-slate-400">บันทึกอัตโนมัติเมื่อทักแชทบอท</span>
              </div>
              <input
                type="text"
                value={settings.line_user_id || ''}
                onChange={(e) => setSettings({ ...settings, line_user_id: e.target.value })}
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (หรือปล่อยว่างเพื่อส่งแบบ Broadcast ไปยังผู้ติดตามทุกคน)"
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>

          {/* Section 2.8: Storage Quota & Progress (หลอด Progress แสดงขนาดพื้นที่ และ Clear Storage) */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">พื้นที่จัดเก็บ & แคช (Storage & Quota)</h2>
                  <p className="text-[11px] text-slate-400">หลอดแสดงพื้นที่การใช้งาน และจัดการ Clear Storage</p>
                </div>
              </div>

              <button
                type="button"
                onClick={refreshStorageInfo}
                title="รีเฟรชขนาดพื้นที่"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Storage Quota Header & Max Limit Selector */}
            <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-white/[0.04] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-white tracking-tight">
                      {storageInfo?.formattedTotal || '0 MB'}
                    </span>
                    <span className="text-xs text-slate-400">
                      / {storageInfo?.formattedMax || `${settings.max_storage_gb || 1} GB`}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    คิดเป็น {storageInfo?.usagePercentage || 0}% ของโควต้าความจุสูงสุด
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">จำกัดความจุ:</span>
                  {[0.5, 1, 2, 5, 10].map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => handleChangeMaxStorage(gb)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border transition-all cursor-pointer ${
                        (settings.max_storage_gb || 1) === gb
                          ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-300 shadow-sm'
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {gb} GB
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Bar (หลอด Progress) */}
              <div className="space-y-1.5">
                <div className="w-full h-3.5 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/10 relative shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (storageInfo?.usagePercentage || 0) >= 90
                        ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse'
                        : (storageInfo?.usagePercentage || 0) >= 70
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                    }`}
                    style={{ width: `${Math.max(2, Math.min(100, storageInfo?.usagePercentage || 0))}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>0 MB</span>
                  <span className={storageInfo?.isNearLimit ? 'text-amber-400 font-bold' : ''}>
                    {storageInfo?.usagePercentage || 0}% ใช้งาน
                  </span>
                  <span>{storageInfo?.formattedMax || `${settings.max_storage_gb || 1} GB`}</span>
                </div>
              </div>

              {/* Storage Category Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                {storageInfo?.categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-black/20">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-300 truncate">{cat.name.split('(')[0].trim()}</span>
                    </div>
                    <span className="text-slate-400 font-mono shrink-0 ml-1">{cat.formatted}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage Feedback message */}
            {storageFeedback && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>{storageFeedback}</span>
              </div>
            )}

            {/* Clear Storage Quick Actions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">ตัวเลือกล้างพื้นที่ (Clear Storage Options)</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearType('chat')}
                  disabled={isClearingStorage}
                  className="py-2 px-2.5 rounded-xl bg-surface-elevated/70 hover:bg-indigo-600/20 border border-white/[0.06] hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">เคลียร์ประวัติแชท</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmClearType('reminders')}
                  disabled={isClearingStorage}
                  className="py-2 px-2.5 rounded-xl bg-surface-elevated/70 hover:bg-violet-600/20 border border-white/[0.06] hover:border-violet-500/40 text-slate-300 hover:text-violet-200 text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="truncate">เคลียร์ตารางงาน & เตือน</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmClearType('cache')}
                  disabled={isClearingStorage}
                  className="py-2 px-2.5 rounded-xl bg-surface-elevated/70 hover:bg-emerald-600/20 border border-white/[0.06] hover:border-emerald-500/40 text-slate-300 hover:text-emerald-200 text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">ล้างแคช & ข้อมูลระบบ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmClearType('all')}
                  disabled={isClearingStorage}
                  className="py-2 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">ล้าง Storage ทั้งหมด</span>
                </button>
              </div>
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
                onChange={(e) => {
                  const val = e.target.checked;
                  setSettings({ ...settings, auto_start: val });
                  if (typeof window !== 'undefined' && (window as any).electronAPI?.setAutoStart) {
                    (window as any).electronAPI.setAutoStart(val);
                  }
                }}
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

      {/* Clear Specific Storage Modal */}
      {confirmClearType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-elevated p-6 rounded-2xl border border-white/20 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">
                {confirmClearType === 'chat' && 'ยืนยันเคลียร์ประวัติการสนทนา?'}
                {confirmClearType === 'reminders' && 'ยืนยันเคลียร์ตารางงานและการแจ้งเตือน?'}
                {confirmClearType === 'cache' && 'ยืนยันล้างแคชระบบและบันทึกชั่วคราว?'}
                {confirmClearType === 'all' && 'ยืนยันล้าง Storage ข้อมูลทั้งหมด?'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmClearType === 'chat' && 'ข้อความสนทนาทั้งหมดในห้องแชทจะถูกลบเพื่อคืนพื้นที่จัดเก็บ (การตั้งค่าและความจำจะยังคงอยู่)'}
              {confirmClearType === 'reminders' && 'รายการตารางงานและการแจ้งเตือนทั้งหมดจะถูกล้างออกจากระบบ'}
              {confirmClearType === 'cache' && 'แคชไฟล์และ Audit Logs ระบบจะถูกลบเพื่อคืนความจุ'}
              {confirmClearType === 'all' && 'ข้อมูลการสนทนา ตารางงาน และแคชทั้งหมดจะถูกลบ (API Keys และการตั้งค่าหลักจะยังคงอยู่)'}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmClearType(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleExecuteClear(confirmClearType)}
                disabled={isClearingStorage}
                className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isClearingStorage ? 'กำลังล้างข้อมูล...' : 'ยืนยันการเคลียร์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};