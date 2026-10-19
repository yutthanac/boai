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
  Sparkles,
  Search,
  Clock,
  MapPin,
  Edit2,
  RotateCcw,
  X
} from 'lucide-react';
import { db } from '../services/db/databaseService';
import { ReminderItem, PlaylistItem } from '../types';
import { lineService } from '../services/line/lineService';
import { useAssistantStore } from '../stores/useAssistantStore';

export const Tools: React.FC = () => {
  const musicTrack = useAssistantStore((s) => s.musicTrack);
  const musicPlaylist = useAssistantStore((s) => s.musicPlaylist);
  const currentPlaylistIndex = useAssistantStore((s) => s.currentPlaylistIndex);
  const toggleMusicPlayPause = useAssistantStore((s) => s.toggleMusicPlayPause);
  const skipNextMusic = useAssistantStore((s) => s.skipNextMusic);
  const playPlaylistItem = useAssistantStore((s) => s.playPlaylistItem);
  const addPlaylistItem = useAssistantStore((s) => s.addPlaylistItem);
  const updatePlaylistItem = useAssistantStore((s) => s.updatePlaylistItem);
  const deletePlaylistItem = useAssistantStore((s) => s.deletePlaylistItem);
  const resetPlaylistToDefault = useAssistantStore((s) => s.resetPlaylistToDefault);

  const [tools, setTools] = useState([
    {
      id: 'weather',
      name: 'สภาพอากาศ',
      description: 'รายงานสภาพอากาศ อุณหภูมิ และปริมาณฝน',
      icon: CloudSun,
      enabled: true,
      color: 'text-amber-400',
    },
    {
      id: 'music',
      name: 'เครื่องเล่นเพลง',
      description: 'เล่นเพลง ค้นหาเพลงในลิสต์ และควบคุมด้วยเสียง',
      icon: Music,
      enabled: true,
      color: 'text-cyan-400',
    },
    {
      id: 'search',
      name: 'ค้นหาข้อมูล',
      description: 'ค้นหาข้อมูลบนอินเทอร์เน็ตและสรุปเนื้อหา',
      icon: Globe,
      enabled: true,
      color: 'text-indigo-400',
    },
    {
      id: 'reminders',
      name: 'แจ้งเตือนและงาน',
      description: 'บันทึกตารางงานและแจ้งเตือนด้วยเสียง',
      icon: Bell,
      enabled: true,
      color: 'text-violet-400',
    },
    {
      id: 'system',
      name: 'คำสั่งระบบ',
      description: 'ควบคุมและสั่งการระบบบนคอมพิวเตอร์',
      icon: Terminal,
      enabled: true,
      color: 'text-rose-400',
      requiresConfirmation: true,
    },
    {
      id: 'line_oa',
      name: 'LINE แจ้งเตือน',
      description: 'ส่งสรุปตารางงานเข้า LINE ผ่าน Webhook',
      icon: MessageSquare,
      enabled: true,
      color: 'text-emerald-400',
    },
  ]);

  // Playlist Management State
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songVideoIdOrUrl, setSongVideoIdOrUrl] = useState('');
  const [songMode, setSongMode] = useState<'youtube' | 'stream'>('youtube');
  const [songFormError, setSongFormError] = useState('');

  const handleOpenAddSong = () => {
    setEditingSongId(null);
    setSongTitle('');
    setSongArtist('');
    setSongVideoIdOrUrl('');
    setSongMode('youtube');
    setSongFormError('');
    setIsAddingSong(true);
  };

  const handleOpenEditSong = (song: PlaylistItem) => {
    setEditingSongId(song.id);
    setSongTitle(song.title);
    setSongArtist(song.artist || '');
    setSongVideoIdOrUrl(song.videoId || song.audioStreamUrl || '');
    setSongMode(song.playbackMode);
    setSongFormError('');
    setIsAddingSong(true);
  };

  const handleSaveSong = () => {
    if (!songTitle.trim()) {
      setSongFormError('กรุณากรอกชื่อเพลง');
      return;
    }

    let videoId: string | undefined;
    let audioStreamUrl: string | undefined;
    const rawInput = songVideoIdOrUrl.trim();

    if (songMode === 'stream') {
      audioStreamUrl = rawInput || undefined;
    } else {
      if (rawInput.includes('v=')) {
        const match = rawInput.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : rawInput;
      } else if (rawInput.includes('youtu.be/')) {
        const match = rawInput.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : rawInput;
      } else if (rawInput.length > 0) {
        videoId = rawInput;
      }
    }

    if (editingSongId) {
      updatePlaylistItem(editingSongId, {
        title: songTitle.trim(),
        artist: songArtist.trim() || undefined,
        videoId,
        audioStreamUrl,
        playbackMode: songMode
      });
    } else {
      addPlaylistItem({
        title: songTitle.trim(),
        artist: songArtist.trim() || undefined,
        videoId,
        audioStreamUrl,
        playbackMode: songMode
      });
    }

    setIsAddingSong(false);
    setEditingSongId(null);
  };

  const handleDeleteSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePlaylistItem(id);
  };

  const handleResetPlaylist = () => {
    if (confirm('ต้องการคืนค่าเพลย์ลิสต์เพลงเริ่มต้นหรือไม่?')) {
      resetPlaylistToDefault();
    }
  };

  // Reminders & Schedule State
  const [reminders, setReminders] = useState<ReminderItem[]>(db.getReminders());
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newReminderLocation, setNewReminderLocation] = useState('');
  const [reminderFilter, setReminderFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [reminderSearch, setReminderSearch] = useState('');

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

  const handleClearCompletedReminders = () => {
    db.clearCompletedReminders();
    setReminders(db.getReminders());
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

  const pendingCount = reminders.filter((r) => !r.completed).length;
  const completedCount = reminders.filter((r) => r.completed).length;

  const displayedReminders = reminders.filter((r) => {
    if (reminderFilter === 'pending' && r.completed) return false;
    if (reminderFilter === 'completed' && !r.completed) return false;
    if (reminderSearch.trim()) {
      const q = reminderSearch.trim().toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchTime = (r.time || '').toLowerCase().includes(q);
      const matchLoc = (r.location || '').toLowerCase().includes(q);
      return matchTitle || matchTime || matchLoc;
    }
    return true;
  });

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
        {/* Panel 1: Music Player & Playlist Manager */}
        <div className="glass-panel p-5 rounded-2xl border border-[#2A2A2A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-[#38BDF8]">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">เครื่องเล่นเพลง</h3>
                <p className="text-xs font-normal text-slate-400">เล่นและจัดการเพลย์ลิสต์เพลงในเครื่อง</p>
              </div>
            </div>

            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-normal flex items-center gap-1.5 ${
              musicTrack?.isPlaying
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-white/5 text-slate-400 border-[#2A2A2A]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${musicTrack?.isPlaying ? 'bg-[#38BDF8] animate-pulse' : 'bg-slate-500'}`} />
              {musicTrack?.isPlaying ? 'กำลังเล่น' : 'หยุดชั่วคราว'}
            </span>
          </div>

          {/* Current Playing Banner */}
          <div className="p-3.5 rounded-xl bg-[#252525] border border-[#2A2A2A] flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shrink-0 ${
                musicTrack?.isPlaying ? 'animate-pulse' : ''
              }`}>
                <Music className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-normal text-white truncate">
                  {musicTrack?.title || musicPlaylist[0]?.title || 'ยังไม่มีเพลงที่เล่น'}
                </p>
                <p className="text-xs font-normal text-slate-400 truncate">
                  {musicTrack?.artist || musicPlaylist[0]?.artist || 'โนอา'} • {musicTrack?.playbackMode === 'stream' ? 'สตรีมเสียงตรง' : 'YouTube Audio'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                onClick={toggleMusicPlayPause}
                className="p-2.5 rounded-xl bg-[#38BDF8] hover:bg-sky-400 text-sky-950 font-semibold transition-all shadow-md cursor-pointer"
                title={musicTrack?.isPlaying ? 'หยุดชั่วคราว' : 'เล่นเพลง'}
              >
                {musicTrack?.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={skipNextMusic}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-[#2A2A2A] transition-colors cursor-pointer"
                title="ข้ามไปเพลงถัดไป"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Playlist Section Header & Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-200">
                รายการเพลงในลิสต์ ({musicPlaylist.length})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenAddSong}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-normal rounded-lg bg-white/5 hover:bg-[#38BDF8]/20 text-slate-200 hover:text-[#38BDF8] border border-[#2A2A2A] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มเพลง</span>
              </button>
              <button
                onClick={handleResetPlaylist}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-normal rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-[#2A2A2A] transition-colors cursor-pointer"
                title="คืนค่าเพลย์ลิสต์เริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>คืนค่าเดิม</span>
              </button>
            </div>
          </div>

          {/* Add / Edit Song Inline Form */}
          {isAddingSong && (
            <div className="p-3.5 rounded-xl bg-[#252525] border border-[#38BDF8]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#38BDF8]">
                  {editingSongId ? 'แก้ไขข้อมูลเพลง' : 'เพิ่มเพลงใหม่เข้าลิสต์'}
                </span>
                <button
                  onClick={() => { setIsAddingSong(false); setEditingSongId(null); }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {songFormError && (
                <p className="text-xs text-rose-400 font-normal">{songFormError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="ชื่อเพลง (เช่น ยอมแลกอะไรก็ได้)"
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]"
                />
                <input
                  type="text"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  placeholder="ศิลปิน (เช่น Tilly Birds)"
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={songVideoIdOrUrl}
                    onChange={(e) => setSongVideoIdOrUrl(e.target.value)}
                    placeholder={songMode === 'stream' ? 'ลิงก์สตรีมเสียงตรง (https://...)' : 'YouTube Link หรือ Video ID (เช่น Advn74fiZsY)'}
                    className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 font-mono focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
                <div>
                  <select
                    value={songMode}
                    onChange={(e) => setSongMode(e.target.value as any)}
                    className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="stream">สตรีมเสียงตรง</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => { setIsAddingSong(false); setEditingSongId(null); }}
                  className="px-3 py-1 rounded-lg text-xs font-normal text-slate-400 hover:text-slate-200 hover:bg-white/5"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveSong}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#38BDF8] hover:bg-sky-400 text-sky-950"
                >
                  {editingSongId ? 'บันทึกการแก้ไข' : 'บันทึกเพลง'}
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Song List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {musicPlaylist.map((song, idx) => {
              const isCurrentPlaying = musicTrack?.title === song.title;
              return (
                <div
                  key={song.id}
                  onClick={() => playPlaylistItem(idx)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                    isCurrentPlaying
                      ? 'bg-[#252525] border-[#38BDF8]/40 shadow-xs'
                      : 'bg-[#1E1E1E] hover:bg-[#252525] border-[#2A2A2A]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xs font-mono text-slate-500 w-5 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className={`text-xs font-normal truncate ${
                        isCurrentPlaying ? 'text-[#38BDF8] font-medium' : 'text-slate-200'
                      }`}>
                        {song.title}
                      </p>
                      <p className="text-xs font-normal text-slate-400 truncate">
                        {song.artist || 'ไม่ระบุศิลปิน'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-xs font-normal px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                      {song.playbackMode === 'stream' ? 'สตรีม' : 'YouTube'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playPlaylistItem(idx);
                      }}
                      className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#38BDF8] transition-colors"
                      title="เล่นเพลงนี้"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditSong(song);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                      title="แก้ไขข้อมูลเพลง"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteSong(song.id, e)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                      title="ลบเพลงนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voice Command Hint */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-[#2A2A2A] text-xs font-normal text-slate-400 flex items-center gap-2">
            <span className="text-[#38BDF8]">💡</span>
            <span>
              สั่งงานด้วยเสียงได้ เช่น <strong className="text-slate-200 font-normal">"เปิดเพลงในลิสต์"</strong>, <strong className="text-slate-200 font-normal">"เล่นเพลงที่ 1"</strong> หรือระบุชื่อเพลงในลิสต์
            </span>
          </div>
        </div>

        {/* Panel 2: Reminders & Tasks List */}
        <div className="glass-panel p-5 rounded-2xl border border-[#2A2A2A] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">แจ้งเตือนและตารางงาน</h3>
                <p className="text-xs font-normal text-slate-400">สั่งงานด้วยเสียง เช่น "มีงานอะไรบ้าง", "ลบงานนั้น", "เพิ่มงาน..."</p>
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
                <span>Export</span>
              </button>
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

          {/* Add Reminder Inputs */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              placeholder="ชื่องาน (เช่น ประชุมโปรเจกต์)..."
              className="flex-1 min-w-[140px] bg-[#252525] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs font-normal text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
            <input
              type="text"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              placeholder="เวลา (เช่น 14:00 น.)"
              className="w-28 bg-[#252525] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs font-normal text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
            <input
              type="text"
              value={newReminderLocation}
              onChange={(e) => setNewReminderLocation(e.target.value)}
              placeholder="สถานที่ (เช่น ห้อง A)"
              className="w-32 bg-[#252525] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs font-normal text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
            <button
              onClick={handleAddReminder}
              disabled={!newReminderTitle.trim()}
              title="เพิ่มงานใหม่"
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-normal flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม</span>
            </button>
          </div>

          {/* Filter Tabs & Search Filter for 'เวลาเลือกดู' */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#2A2A2A]">
            <div className="flex items-center gap-1 bg-[#252525] p-1 rounded-xl border border-[#2A2A2A] text-xs font-normal">
              <button
                onClick={() => setReminderFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  reminderFilter === 'all'
                    ? 'bg-violet-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ทั้งหมด ({reminders.length})
              </button>
              <button
                onClick={() => setReminderFilter('pending')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  reminderFilter === 'pending'
                    ? 'bg-violet-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                รอดำเนินการ ({pendingCount})
              </button>
              <button
                onClick={() => setReminderFilter('completed')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  reminderFilter === 'completed'
                    ? 'bg-violet-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                เสร็จแล้ว ({completedCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={reminderSearch}
                  onChange={(e) => setReminderSearch(e.target.value)}
                  placeholder="ค้นหางาน..."
                  className="bg-[#111624] border border-white/10 rounded-xl pl-8 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500/50 w-32 sm:w-40"
                />
              </div>

              {completedCount > 0 && (
                <button
                  onClick={handleClearCompletedReminders}
                  title="ล้างงานที่ทำเสร็จแล้วออกจากตาราง"
                  className="text-[11px] text-slate-300 hover:text-rose-300 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/[0.06] hover:border-rose-500/30 transition-all cursor-pointer"
                >
                  ล้างที่เสร็จ ({completedCount})
                </button>
              )}
            </div>
          </div>

          {/* Reminders List */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {displayedReminders.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-surface-elevated/40 border border-dashed border-white/[0.06] text-slate-400 text-xs space-y-1">
                <p className="font-medium text-slate-300">
                  {reminderSearch ? 'ไม่พบงานที่ตรงกับคำค้นหาค่ะ' : 'ไม่มีรายการงานในหมวดนี้ค่ะ'}
                </p>
                <p className="text-[11px] text-slate-500">
                  สั่งด้วยเสียงได้ทันที เช่น "เพิ่มงานอื่นว่า ประชุม 10 โมง" หรือ "ลบงานนั้น"
                </p>
              </div>
            ) : (
              displayedReminders.map((r, idx) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                    r.completed
                      ? 'bg-surface-elevated/40 border-white/[0.03] opacity-60'
                      : 'bg-surface-elevated/70 border-white/[0.06] hover:border-violet-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <button
                      onClick={() => handleToggleReminder(r.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        r.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-500 hover:border-violet-400'
                      }`}
                      title={r.completed ? 'คลิกเพื่อเปลี่ยนเป็นยังไม่เสร็จ' : 'คลิกเมื่อทำงานเสร็จแล้ว'}
                    >
                      {r.completed && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">
                      #{idx + 1}
                    </span>
                    <span className={`font-medium ${r.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {r.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      {r.time || 'ไม่ระบุเวลา'}
                    </span>
                    {r.location && (
                      <span className="text-[10px] text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5 text-violet-400" />
                        {r.location}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors shrink-0 ml-2"
                    title="ลบงานนี้ออกจากตาราง"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Panel 3: LINE Official Account & Webhook Integration */}
      <div className="glass-panel p-5 rounded-2xl border border-[#2A2A2A] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-white">LINE แจ้งเตือนและ Webhook</h3>
                <span className="px-2 py-0.5 rounded text-xs font-normal bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Webhook Active (Port {webhookInfo?.port || 3000})
                </span>
              </div>
              <p className="text-xs font-normal text-slate-400 mt-0.5">
                ส่งตารางงานเข้า LINE เมื่อสั่ง: <span className="text-emerald-300 font-mono">"ช่วยส่งตารางของวันนี้ไปที่ไลน์"</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleSendScheduleToLine}
            disabled={isSendingLine}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-normal rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSendingLine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>ทดสอบส่งเข้า LINE</span>
          </button>
        </div>

        {/* Webhook URL Endpoint Box */}
        <div className="p-3.5 rounded-xl bg-[#252525] border border-[#2A2A2A] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-normal flex items-center gap-1.5">
              <span>Webhook URL Endpoint (Local Server):</span>
            </span>
            <button
              onClick={handleCopyWebhookUrl}
              className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
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
              className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-mono select-all focus:outline-none"
            />
            <button
              onClick={handleCopyWebhookUrl}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-[#2A2A2A] flex items-center gap-1.5 transition-colors"
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
