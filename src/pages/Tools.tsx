import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Music,
  Globe,
  Bell,
  Terminal,
  ShieldAlert,
  CheckCircle2,
  Play,
  Pause,
  SkipForward,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Download,
  Calendar,
  MessageSquare,
  Send,
  Copy,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';
import { db } from '../services/db/databaseService';
import { ReminderItem } from '../types';
import { lineService } from '../services/line/lineService';

export const Tools: React.FC = () => {
  const [tools, setTools] = useState([
    {
      id: 'weather',
      name: 'สภาพอากาศ (Weather Radar)',
      description: 'ตรวจจับและรายงานสภาพอากาศ อุณหภูมิ ดัชนี UV และฝนแบบเรียลไทม์',
      icon: CloudSun,
      enabled: true,
      color: 'text-amber-400',
    },
    {
      id: 'music',
      name: 'ควบคุมเพลง & สื่อ (Media Control)',
      description: 'สั่งเล่นเพลง หยุดเพลง สลับเพลงแนว Lo-fi หรือ Spotify/YouTube Music',
      icon: Music,
      enabled: true,
      color: 'text-cyan-400',
    },
    {
      id: 'search',
      name: 'ค้นหาเว็บ (Web & Knowledge Search)',
      description: 'เปิดเบราว์เซอร์ ค้นหาข้อมูลบน Google, Wikipedia และสรุปเนื้อหาทันที',
      icon: Globe,
      enabled: true,
      color: 'text-indigo-400',
    },
    {
      id: 'reminders',
      name: 'การแจ้งเตือน & ตารางงาน (Reminders & Schedule)',
      description: 'เรียกดู/บันทึกตารางงานและแจ้งเตือน สั่งงานด้วยเสียง และ Export เป็นไฟล์ CSV',
      icon: Bell,
      enabled: true,
      color: 'text-violet-400',
    },
    {
      id: 'system',
      name: 'คำสั่งระบบ Windows (System Control)',
      description: 'ล็อคหน้าจอ เปิดโปรแกรม ปิดเครื่อง (มีระบบ Safe Confirmation ป้องกัน)',
      icon: Terminal,
      enabled: true,
      color: 'text-rose-400',
      requiresConfirmation: true,
    },
    {
      id: 'line_oa',
      name: 'LINE OA Chatbot & Webhook',
      description: 'ส่งการแจ้งเตือนตารางงานเข้า LINE เฉพาะเมื่อสั่งด้วยเสียงหรือแชท พร้อม Webhook อัตโนมัติ',
      icon: MessageSquare,
      enabled: true,
      color: 'text-emerald-400',
    },
  ]);

  // Media Player State
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [currentTrack, setCurrentTrack] = useState('Lo-fi Chill Beats for Deep Coding');

  // Reminders & Schedule State
  const [reminders, setReminders] = useState<ReminderItem[]>(db.getReminders());
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newReminderLocation, setNewReminderLocation] = useState('');

  // LINE Official Account State
  const [isSendingLine, setIsSendingLine] = useState(false);
  const [lineSendFeedback, setLineSendFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [lineUserId, setLineUserId] = useState(() => db.getLineUserId());
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedNgrok, setCopiedNgrok] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<{ port: number; endpoint: string; running: boolean } | null>(null);

  // Real-time synchronization when reminders or LINE user are updated
  useEffect(() => {
    const handleSync = () => {
      setReminders(db.getReminders());
    };
    window.addEventListener('noar-reminders-updated', handleSync);

    if (typeof window !== 'undefined' && (window as any).electronAPI?.getLineWebhookInfo) {
      (window as any).electronAPI.getLineWebhookInfo().then((info: any) => {
        if (info) setWebhookInfo(info);
      }).catch(() => {});
    }

    const handleLineUserSync = (e: any) => {
      if (e.detail?.userId) {
        setLineUserId(e.detail.userId);
      }
    };
    window.addEventListener('noar-line-user-updated', handleLineUserSync);

    return () => {
      window.removeEventListener('noar-reminders-updated', handleSync);
      window.removeEventListener('noar-line-user-updated', handleLineUserSync);
    };
  }, []);

  const handleSendScheduleToLine = async () => {
    setIsSendingLine(true);
    setLineSendFeedback(null);
    try {
      const res = await lineService.sendScheduleToLine('วันนี้');
      setLineSendFeedback({ success: res.success, message: res.message });
      setTimeout(() => setLineSendFeedback(null), 6000);
    } catch (e: any) {
      setLineSendFeedback({ success: false, message: e?.message || 'ส่งข้อความเข้า LINE ล้มเหลว' });
      setTimeout(() => setLineSendFeedback(null), 6000);
    } finally {
      setIsSendingLine(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    const port = webhookInfo?.port || 3000;
    const url = `http://localhost:${port}/api/line/webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleCopyNgrok = () => {
    const port = webhookInfo?.port || 3000;
    navigator.clipboard.writeText(`npx ngrok http ${port}`);
    setCopiedNgrok(true);
    setTimeout(() => setCopiedNgrok(false), 2500);
  };

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const toggleTool = (id: string) => {
    setTools(tools.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  const handleAddReminder = () => {
    if (!newReminderTitle.trim()) return;
    const added = db.addReminder(newReminderTitle, newReminderTime || 'เร็วๆ นี้', newReminderLocation || undefined);
    setReminders([added, ...reminders]);
    setNewReminderTitle('');
    setNewReminderTime('');
    setNewReminderLocation('');
  };

  const handleToggleReminder = (id: string) => {
    db.toggleReminder(id);
    setReminders(reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  };

  const handleDeleteReminder = (id: string) => {
    db.deleteReminder(id);
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const handleExportSchedule = () => {
    if (reminders.length === 0) {
      alert('ยังไม่มีรายการตารางงานหรือการแจ้งเตือนให้ Export ค่ะ');
      return;
    }
    const csv = db.exportRemindersCSV();
    const todayStr = new Date().toISOString().split('T')[0];
    db.downloadExportFile(csv, `noar_schedule_${todayStr}.csv`, 'text/csv;charset=utf-8;');
  };

  const [systemActionResultMsg, setSystemActionResultMsg] = useState<string | null>(null);

  const triggerSystemAction = (actionName: string) => {
    setPendingAction(actionName);
    setShowConfirmModal(true);
  };

  const confirmSystemAction = async () => {
    if (!pendingAction) return;
    try {
      if ((window as any).electronAPI?.executeSystemAction) {
        if (pendingAction.includes('ล็อคหน้าจอ')) {
          await (window as any).electronAPI.executeSystemAction('lock');
        } else if (pendingAction.includes('เครื่องคิดเลข')) {
          await (window as any).electronAPI.executeSystemAction('calc');
        } else if (pendingAction.includes('Notepad')) {
          await (window as any).electronAPI.executeSystemAction('notepad');
        } else if (pendingAction.includes('Task Manager')) {
          await (window as any).electronAPI.executeSystemAction('taskmgr');
        } else if (pendingAction.includes('โฟลเดอร์')) {
          await (window as any).electronAPI.executeSystemAction('explorer');
        }
      }
      setSystemActionResultMsg(`ดำเนินการคำสั่ง "${pendingAction}" สำเร็จ`);
      setTimeout(() => setSystemActionResultMsg(null), 3000);                         
    } catch (e: any) {
      setSystemActionResultMsg(`เกิดข้อผิดพลาด: ${e?.message}`);
      setTimeout(() => setSystemActionResultMsg(null), 3000);
    }
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            เครื่องมือ & ระบบภายนอก (Tools & Integrations)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            เครื่องมือเสริมที่โนอาสามารถเรียกใช้งานได้อัตโนมัติเมื่อสั่งด้วยเสียงหรือแชท
          </p>
        </div>
      </div>

      {/* Tools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className={`glass-panel p-4 rounded-xl border transition-all flex flex-col justify-between ${
                tool.enabled ? 'border-white/[0.08] hover:border-indigo-500/40' : 'border-white/[0.03] opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl bg-surface-elevated ${tool.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => toggleTool(tool.id)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      tool.enabled ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        tool.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-white">{tool.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{tool.description}</p>
              </div>

              {tool.requiresConfirmation && (
                <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] text-amber-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>ต้องกดยืนยันคำสั่งก่อนทำงานเสมอ</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Tool Sandbox Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Music Player Widget */}
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">เครื่องเล่นเพลง (Media Player)</h3>
                <p className="text-[11px] text-slate-400">สั่งงานด้วยเสียง เช่น "โนอา เปิดเพลง"</p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              {isPlayingMedia ? 'กำลังเล่น' : 'หยุดชั่วคราว'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white ${
                  isPlayingMedia ? 'animate-pulse' : ''
                }`}
              >
                <Music className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{currentTrack}</p>
                <p className="text-[10px] text-slate-400">ChillHop Ambient • เสียง 70%</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlayingMedia(!isPlayingMedia)}
                className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md"
              >
                {isPlayingMedia ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCurrentTrack('Synthwave Night Drive Cyber-Flow')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                title="เพลงถัดไป"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Panel 2: Reminders & Tasks List */}
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">การแจ้งเตือน & ตารางงาน (Reminders & Schedule)</h3>
                <p className="text-[11px] text-slate-400">สั่งงานด้วยเสียง เช่น "มีแจ้งเตือนอะไรบ้าง", "บันทึกตารางงาน...ให้หน่อย", "โนอา export ให้หน่อย"</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendScheduleToLine}
                disabled={isSendingLine}
                title="ส่งตารางงานวันนี้เข้า LINE OA ทันที"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingLine ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>ส่งตารางไปที่ LINE</span>
              </button>
              <button
                onClick={handleExportSchedule}
                title="ส่งออกตารางงานและการแจ้งเตือนเป็นไฟล์ CSV (เปิดใน Excel ได้)"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-violet-600/20 text-slate-300 hover:text-violet-300 border border-white/10 hover:border-violet-500/30 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-violet-400" />
                <span>Export ตารางงาน</span>
              </button>
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                {reminders.filter((r) => !r.completed).length} รายการค้าง
              </span>
            </div>
          </div>

          {/* Feedback banner when sending to LINE */}
          {lineSendFeedback && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
              lineSendFeedback.success
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}>
              {lineSendFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="leading-relaxed">{lineSendFeedback.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              placeholder="งานอะไร (เช่น ประชุมโปรเจกต์)..."
              className="flex-1 min-w-[150px] bg-[#111624] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
            />
            <input
              type="text"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              placeholder="เมื่อไหร่ (เช่น 14:00 น.)"
              className="w-28 bg-[#111624] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
            />
            <input
              type="text"
              value={newReminderLocation}
              onChange={(e) => setNewReminderLocation(e.target.value)}
              placeholder="ที่ไหน (เช่น ห้องประชุม A)"
              className="w-32 bg-[#111624] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
            />
            <button
              onClick={handleAddReminder}
              disabled={!newReminderTitle.trim()}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/70 border border-white/[0.04] text-xs"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleToggleReminder(r.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      r.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-500 hover:border-violet-400'
                    }`}
                  >
                    {r.completed && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                  <span className={r.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                    {r.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">({r.time})</span>
                  {r.location && (
                    <span className="text-[10px] text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      📍 {r.location}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteReminder(r.id)}
                  className="text-slate-500 hover:text-rose-400 shrink-0 ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 3: LINE Official Account & Webhook Integration */}
      <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">LINE Official Account & Webhook (ส่งตารางงานเข้า LINE)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Webhook Active (Port {webhookInfo?.port || 3000})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ส่งตารางงานเข้า LINE OA เฉพาะเมื่อสั่ง: <span className="text-emerald-300 font-mono">"ช่วยส่งตารางของวันนี้ไปที่ไลน์ให้หน่อย"</span> หรือระบุวันที่เท่านั้น
              </p>
            </div>
          </div>

          <button
            onClick={handleSendScheduleToLine}
            disabled={isSendingLine}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSendingLine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>ทดสอบส่งตารางงานเข้า LINE</span>
          </button>
        </div>

        {/* Webhook URL Endpoint Box */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <span>Webhook URL Endpoint (Local Server):</span>
            </span>
            <button
              onClick={handleCopyWebhookUrl}
              className="text-[11px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWebhook ? 'คัดลอกแล้ว!' : 'คัดลอก Local URL'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`http://localhost:${webhookInfo?.port || 3000}/api/line/webhook`}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-mono select-all focus:outline-none"
            />
            <button
              onClick={handleCopyWebhookUrl}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>

          {/* LINE Webhook HTTPS Notice & Ngrok Guide */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-amber-300">
                  LINE Webhook ต้องใช้ URL ที่เป็น HTTPS และเป็น Public Domain เท่านั้น
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  เนื่องจาก LINE บังคับว่า Webhook URL ต้องขึ้นต้นด้วย <span className="text-emerald-400 font-mono font-bold">https://</span> (ไม่รองรับ <code className="text-rose-400 font-mono">http://localhost</code>)
                  จึงต้องใช้ Reverse Proxy Tunnel เช่น <strong className="text-cyan-300">ngrok</strong> เพื่อแปลงพอร์ตในเครื่องให้เป็น HTTPS สาธารณะ
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">คำสั่งรัน ngrok:</span>
                  <div className="flex items-center gap-1.5 bg-black/60 border border-amber-500/40 rounded-lg px-2.5 py-1">
                    <code className="text-emerald-400 font-mono text-[11px]">npx ngrok http {webhookInfo?.port || 3000}</code>
                    <button
                      onClick={handleCopyNgrok}
                      className="ml-1 text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 transition-colors"
                    >
                      {copiedNgrok ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedNgrok ? 'คัดลอกคำสั่งแล้ว' : 'คัดลอกคำสั่ง'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  ตัวอย่าง: เมื่อ ngrok แสดง URL เช่น <code className="text-cyan-300 font-mono">https://abc123.ngrok-free.app</code> ให้นำไปใส่ใน LINE Developers Console เป็น:
                  <br />
                  <span className="text-emerald-300 font-mono font-semibold">https://abc123.ngrok-free.app/api/line/webhook</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.04]">
              <span className="text-slate-300 font-medium">Channel Secret (.env):</span>
              <div className="font-mono text-emerald-400 text-[11px] mt-0.5 truncate">
                71ff04a0ec6aa3923cdc447ae7331589
              </div>
            </div>
            <div className="bg-black/20 p-2 rounded-lg border border-white/[0.04]">
              <span className="text-slate-300 font-medium">LINE User ID (ผู้รับ):</span>
              <div className="font-mono text-slate-300 text-[11px] mt-0.5 truncate">
                {lineUserId || 'รอตรวจจับอัตโนมัติเมื่อทักบอท (หรือส่งแบบ Broadcast)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Command Demo & Safety Gate */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">ทดสอบคำสั่งระบบ (System Commands)</h3>
          </div>
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Safe Confirmation Guarded
          </span>
        </div>

        {systemActionResultMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{systemActionResultMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => triggerSystemAction('ล็อคหน้าจอคอมพิวเตอร์ (Lock Screen)')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1.5"
          >
            🔒 สั่งล็อคหน้าจอ
          </button>
          <button
            onClick={() => triggerSystemAction('เปิดเครื่องคิดเลข (Calculator)')}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-xs text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1.5"
          >
            🧮 เปิดเครื่องคิดเลข
          </button>
          <button
            onClick={() => triggerSystemAction('เปิด Notepad (สมุดจด)')}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-xs text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5"
          >
            📝 เปิด Notepad
          </button>
          <button
            onClick={() => triggerSystemAction('เปิด Task Manager (จัดการระบบ)')}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            ⚙️ เปิด Task Manager
          </button>
          <button
            onClick={() => triggerSystemAction('เปิดโฟลเดอร์ไฟล์ (File Explorer)')}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            📁 เปิด File Explorer
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-elevated p-6 rounded-2xl border border-rose-500/40 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันคำสั่งระบบ</h3>
                <p className="text-xs text-slate-400">Privacy & System Safety Guard</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              คุณต้องการอนุญาตให้โนอาดำเนินการคำสั่ง:
              <br />
              <span className="font-semibold text-rose-300 mt-1 block">
                "{pendingAction}"
              </span>
              ใช่หรือไม่?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmSystemAction}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors"
              >
                ยืนยันการดำเนินการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
