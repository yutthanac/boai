import React, { useState, useEffect } from 'react';
import { db } from '../services/db/databaseService';
import { MemoryItem, MemoryAuditLog, MemoryCategory } from '../types';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Search,
  Star,
  Download,
  Check,
  Clock,
  ShieldCheck,
  History,
  Archive,
  RefreshCw,
  X,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export const Memory: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>(db.getMemories(true));
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<MemoryAuditLog[]>([]);

  // Add Memory Form
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');
  const [newImportance, setNewImportance] = useState(4);
  const [newConfidence, setNewConfidence] = useState(90);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Status Notification
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = () => {
    setMemories(db.getMemories(true));
    setAuditLogs(db.getMemoryAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleAddMemory = () => {
    if (!newContent.trim()) return;
    const conflict = db.detectMemoryConflict(newContent);
    const added = db.addMemory(
      newContent,
      newCategory,
      newImportance,
      newConfidence,
      true
    );
    loadData();
    setNewContent('');
    if (conflict.conflict) {
      showStatus(`บันทึกแล้ว (แจ้งเตือน: ${conflict.reason})`);
    } else {
      showStatus('เพิ่มข้อมูลความจำเรียบร้อย');
    }
  };

  const handleDelete = (id: string) => {
    db.purgeMemory(id);
    loadData();
    showStatus('ลบข้อมูลความจำและบันทึก Audit Log แล้ว');
  };

  const handleVerify = (id: string) => {
    db.verifyMemory(id);
    loadData();
    showStatus('ยืนยันความถูกต้องของข้อมูลแล้ว (ความมั่นใจ 100%)');
  };

  const handleArchive = (id: string) => {
    db.archiveMemory(id);
    loadData();
    showStatus('ย้ายข้อมูลไปคลังความจำเก่า (Archived)');
  };

  const handleStartEdit = (m: MemoryItem) => {
    setEditingId(m.id);
    setEditContent(m.content);
  };

  const handleSaveEdit = (m: MemoryItem) => {
    const updated: MemoryItem = {
      ...m,
      content: editContent.trim(),
      updated_at: new Date().toISOString(),
    };
    db.updateMemory(updated);
    loadData();
    setEditingId(null);
    showStatus('อัปเดตข้อมูลความจำแล้ว');
  };

  const handlePruneExpired = () => {
    const result = db.pruneExpiredMemories();
    loadData();
    showStatus(`ล้างข้อมูลความจำที่หมดอายุเรียบร้อย (${result.prunedCount} รายการ)`);
  };

  const handleExportBackup = () => {
    const jsonStr = db.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boai_memory_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('ส่งออกสำรองข้อมูลความจำสำเร็จ');
  };

  const categories = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'preference', label: 'ความชอบ/รสนิยม' },
    { id: 'food', label: 'อาหาร/เครื่องดื่ม' },
    { id: 'work', label: 'การทำงาน/โค้ด' },
    { id: 'health', label: 'สุขภาพ/แพ้ยา' },
    { id: 'routine', label: 'กิจวัตรประจำวัน' },
    { id: 'personal', label: 'ข้อมูลส่วนตัว' },
    { id: 'other', label: 'อื่นๆ' },
  ];

  const filtered = memories.filter((m) => {
    const matchesSearch = m.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesArchive = showArchived ? true : m.status !== 'archived';
    return matchesSearch && matchesCat && matchesArchive;
  });

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">ระบบความจำ (Memory Bank)</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {memories.filter((m) => m.status !== 'archived').length} ความจำพร้อมใช้งาน
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            สกัดข้อเท็จจริง ตรวจจับข้อมูลขัดแย้ง บันทึก Audit Log และดูแลรักษาความถูกต้องของข้อมูลส่วนบุคคล (Privacy-First)
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="text-xs text-emerald-400 font-medium animate-pulse flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {statusMessage}
            </span>
          )}

          <button
            onClick={handlePruneExpired}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm"
            title="ตรวจหาและล้างข้อมูลความจำที่หมดอายุหรือชั่วคราว"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            โละข้อมูลหมดอายุ (Prune)
          </button>

          <button
            onClick={() => {
              setAuditLogs(db.getMemoryAuditLogs());
              setShowAuditModal(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm"
            title="ดูประวัติการบันทึก การลบ และการแก้ไขความจำทั้งหมด"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            Audit Log ({auditLogs.length})
          </button>

          <button
            onClick={handleExportBackup}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            สำรองข้อมูล
          </button>
        </div>
      </div>

      {/* Add New Memory Card */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400" />
          เพิ่มความจำใหม่ให้ผู้ช่วย (Add Long-term Memory)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-300">ข้อเท็จจริงหรือความจำ</label>
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="เช่น ชอบดื่มมัทฉะลาเต้หวานน้อย, แพ้อาหารทะเล, ตื่นนอน 07:00 น."
              className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">หมวดหมู่</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="preference">ความชอบ/รสนิยม</option>
              <option value="food">อาหาร/เครื่องดื่ม</option>
              <option value="work">การทำงาน/โค้ด</option>
              <option value="health">สุขภาพ/แพ้ยา</option>
              <option value="routine">กิจวัตรประจำวัน</option>
              <option value="personal">ข้อมูลส่วนตัว</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">ความสำคัญ ({newImportance}/5)</span>
              <span className="text-indigo-400 font-mono">มั่นใจ {newConfidence}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={newImportance}
              onChange={(e) => setNewImportance(Number(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer mt-2"
            />
          </div>
        </div>

        <button
          onClick={handleAddMemory}
          disabled={!newContent.trim()}
          className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          บันทึกลงความจำ
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === c.id
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/[0.04]'
              }`}
            >
              {c.label}
            </button>
          ))}

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              showArchived
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/[0.04]'
            }`}
          >
            <Archive className="w-3 h-3" />
            รวมข้อมูลเก่า
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาข้อเท็จจริง..."
            className="bg-transparent w-full focus:outline-none placeholder-slate-500"
          />
        </div>
      </div>

      {/* Memories List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-slate-500">
            <Brain className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs">ไม่พบรายการความจำที่ค้นหา</p>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className={`glass-panel p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                m.status === 'archived'
                  ? 'opacity-60 border-white/[0.04] bg-[#0A0D14]'
                  : 'border-white/[0.06] hover:border-indigo-500/30'
              }`}
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-surface-elevated text-indigo-300 border border-white/[0.08]">
                    {m.category}
                  </span>

                  {/* Confidence Badge */}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    มั่นใจ {m.confidence ?? 85}%
                  </span>

                  {/* Verification Status Badge */}
                  {m.verified ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> ยืนยันแล้ว
                    </span>
                  ) : (
                    <button
                      onClick={() => handleVerify(m.id)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                      title="คลิกเพื่อยืนยันว่าข้อมูลนี้ถูกต้อง"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> รอยืนยัน (คลิกเพื่อยืนยัน)
                    </button>
                  )}

                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: m.importance }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {new Date(m.created_at).toLocaleDateString('th-TH')}
                  </span>
                </div>

                {editingId === m.id ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1 bg-[#111624] border border-indigo-500/50 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveEdit(m)}
                      className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">{m.content}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartEdit(m)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="แก้ไขข้อความ"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {m.status !== 'archived' && (
                  <button
                    onClick={() => handleArchive(m.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title="ย้ายไปเก็บคลังเก่า (Archive)"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="ล้างข้อมูลทิ้งทันที (Purge)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Memory Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0C111C] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  ประวัติความจำ (Memory Audit & Traceability Log)
                </h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">ยังไม่มีประวัติการจัดการความจำ</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            log.action === 'created'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.action === 'conflicted'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : log.action === 'deleted'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-slate-200">{log.description}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('th-TH')}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
