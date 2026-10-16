import React, { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { db } from '../services/db/databaseService';
import { ReminderItem } from '../types';

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
      name: 'การแจ้งเตือน (Smart Reminders)',
      description: 'ตั้งเตือนเวลาทำสิ่งต่างๆ บันทึกสิ่งที่ต้องทำ และแจ้งเตือนผ่านเสียงพูด',
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
  ]);

  // Media Player State
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [currentTrack, setCurrentTrack] = useState('Lo-fi Chill Beats for Deep Coding');

  // Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>(db.getReminders());
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const toggleTool = (id: string) => {
    setTools(tools.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  const handleAddReminder = () => {
    if (!newReminderTitle.trim()) return;
    const added = db.addReminder(newReminderTitle, newReminderTime || 'เร็วๆ นี้');
    setReminders([added, ...reminders]);
    setNewReminderTitle('');
    setNewReminderTime('');
  };

  const handleToggleReminder = (id: string) => {
    db.toggleReminder(id);
    setReminders(reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  };

  const handleDeleteReminder = (id: string) => {
    db.deleteReminder(id);
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const triggerSystemAction = (actionName: string) => {
    setPendingAction(actionName);
    setShowConfirmModal(true);
  };

  const confirmSystemAction = () => {
    alert(`ยืนยันการดำเนินการคำสั่งระบบ: "${pendingAction}" สำเร็จ`);
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
            เครื่องมือเสริมที่น้องโบสามารถเรียกใช้งานได้อัตโนมัติเมื่อสั่งด้วยเสียงหรือแชท
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
                <p className="text-[11px] text-slate-400">สั่งงานด้วยเสียง เช่น "น้องโบ เปิดเพลง"</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">การแจ้งเตือน (Reminders)</h3>
                <p className="text-[11px] text-slate-400">สั่งงานด้วยเสียง เช่น "น้องโบ ช่วยเตือนตอนสี่โมง"</p>
              </div>
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {reminders.filter((r) => !r.completed).length} รายการค้าง
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              placeholder="เพิ่มสิ่งที่ต้องเตือน..."
              className="flex-1 bg-[#111624] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
            />
            <input
              type="text"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              placeholder="เวลา (เช่น 15:30 น.)"
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleReminder(r.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
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
                </div>
                <button
                  onClick={() => handleDeleteReminder(r.id)}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => triggerSystemAction('ล็อคหน้าจอคอมพิวเตอร์ (Lock Screen)')}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors"
          >
            สั่งล็อคหน้าจอ
          </button>
          <button
            onClick={() => triggerSystemAction('เปิดโฟลเดอร์ดาวน์โหลด (Open Downloads)')}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors"
          >
            เปิดโฟลเดอร์งาน
          </button>
          <button
            onClick={() => triggerSystemAction('ล้างไฟล์ขยะชั่วคราว (Clear Temp Files)')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 border border-rose-500/30 transition-colors"
          >
            ล้างแคชชั่วคราว
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
              คุณต้องการอนุญาตให้น้องโบดำเนินการคำสั่ง:
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
