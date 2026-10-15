import React, { useState, useEffect } from 'react';
import { db } from '../services/db/databaseService';
import { MemoryItem } from '../types';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Search,
  Star,
  Download,
  Upload,
  Check,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react';

export const Memory: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>(db.getMemories());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('preference');
  const [newImportance, setNewImportance] = useState(5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setMemories(db.getMemories());
  }, []);

  const handleAddMemory = () => {
    if (!newContent.trim()) return;
    const added = db.addMemory(newContent, newCategory, newImportance);
    setMemories([added, ...memories]);
    setNewContent('');
  };

  const handleDelete = (id: string) => {
    db.deleteMemory(id);
    setMemories(memories.filter((m) => m.id !== id));
  };

  const handleStartEdit = (m: MemoryItem) => {
    setEditingId(m.id);
    setEditContent(m.content);
  };

  const handleSaveEdit = (m: MemoryItem) => {
    const updated = { ...m, content: editContent };
    db.updateMemory(updated);
    setMemories(memories.map((x) => (x.id === m.id ? updated : x)));
    setEditingId(null);
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
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const categories = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'preference', label: 'รสนิยม/การตั้งค่า' },
    { id: 'work', label: 'การทำงาน/โค้ด' },
    { id: 'routine', label: 'กิจวัตรประจำวัน' },
    { id: 'personal', label: 'ข้อมูลส่วนตัว' },
    { id: 'other', label: 'อื่นๆ' },
  ];

  const filtered = memories.filter((m) => {
    const matchesSearch = m.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              ระบบความจำ (Memory Bank)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {memories.length} ความจำที่บันทึก
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            จัดเก็บข้อเท็จจริงระยะยาวเกี่ยวกับคุณในเครื่อง (Privacy-first) เพื่อให้น้องโบเข้าใจคุณได้ดีที่สุด
          </p>
        </div>

        {/* Export / Backup button (from user decision) */}
        <button
          onClick={handleExportBackup}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
        >
          {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-indigo-400" />}
          {copySuccess ? 'ส่งออกสำเร็จ' : 'สำรองข้อมูล (Export Backup)'}
        </button>
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
              placeholder="เช่น ชอบดื่มชาเขียวหวานน้อย, เลิกงาน 18:00 น., ใช้ Visual Studio Code"
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
              <option value="preference">รสนิยม/การตั้งค่า</option>
              <option value="work">การทำงาน/โค้ด</option>
              <option value="routine">กิจวัตรประจำวัน</option>
              <option value="personal">ข้อมูลส่วนตัว</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              ความสำคัญ ({newImportance}/5)
            </label>
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
          className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          บันทึกลงความจำ
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pill Filters */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === c.id
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/[0.04]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาความจำ..."
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
              className="glass-panel p-4 rounded-xl border border-white/[0.06] flex items-center justify-between gap-4 hover:border-indigo-500/30 transition-all"
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-surface-elevated text-indigo-300 border border-white/[0.08]">
                    {m.category}
                  </span>

                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: m.importance }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
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
                  <p className="text-xs text-slate-200 leading-relaxed">{m.content}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartEdit(m)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="แก้ไขความจำ"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="ลบความจำนี้"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
