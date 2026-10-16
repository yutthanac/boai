import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  BookOpen,
  MessageCircle,
  FlaskConical,
  Save,
  Plus,
  Trash2,
  Upload,
  Download,
  Search,
  Check,
  Send,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Sliders,
  HelpCircle,
  Clock
} from 'lucide-react';
import { db } from '../../services/db/databaseService';
import { aiService } from '../../services/ai/aiService';
import { ExampleTrainingItem, KnowledgeItem, PersonalityConfig, StyleTuning } from '../../types';

export const TrainingStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personality' | 'knowledge' | 'examples' | 'testlab'>('personality');

  // Personality & Tone Sliders State
  const [personality, setPersonality] = useState<PersonalityConfig>(db.getPersonality());
  const [tuning, setTuning] = useState<StyleTuning>(
    db.getPersonality().tuning || {
      wittiness: 65,
      friendliness: 85,
      formality: 20,
      conciseness: 80,
    }
  );
  const [personalitySaved, setPersonalitySaved] = useState(false);

  // Knowledge State
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>(db.getKnowledge());
  const [searchKnowledge, setSearchKnowledge] = useState('');
  const [newKnowledgeTitle, setNewKnowledgeTitle] = useState('');
  const [newKnowledgeContent, setNewKnowledgeContent] = useState('');

  // Examples State
  const [examplesList, setExamplesList] = useState<ExampleTrainingItem[]>(db.getExamples());
  const [newQuery, setNewQuery] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  // Test Lab State
  const [testMessages, setTestMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; latencyMs?: number; rating?: number; queryRef?: string }>
  >([
    {
      role: 'assistant',
      content: 'สวัสดีแก! โบ้พร้อมให้ทดสอบแล้ว ลองถามมาได้เลย เดี๋ยวตอบตามสไตล์และบุคลิกที่ตั้งค่าไว้ให้ดู!',
    },
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTestThinking, setIsTestThinking] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const currentPers = db.getPersonality();
    setPersonality(currentPers);
    if (currentPers.tuning) {
      setTuning(currentPers.tuning);
    }
    setKnowledgeList(db.getKnowledge());
    setExamplesList(db.getExamples());
  }, []);

  // Save Personality & Tuning Sliders
  const handleSavePersonality = () => {
    const updated: PersonalityConfig = {
      ...personality,
      tuning,
    };
    db.savePersonality(updated);
    setPersonality(updated);
    setPersonalitySaved(true);
    setTimeout(() => setPersonalitySaved(false), 2500);
  };

  // Add Knowledge
  const handleAddKnowledge = () => {
    if (!newKnowledgeTitle.trim() || !newKnowledgeContent.trim()) return;
    const item = db.addKnowledge(newKnowledgeTitle, newKnowledgeContent, 'manual');
    setKnowledgeList([item, ...knowledgeList]);
    setNewKnowledgeTitle('');
    setNewKnowledgeContent('');
  };

  const handleDeleteKnowledge = (id: string) => {
    db.deleteKnowledge(id);
    setKnowledgeList(knowledgeList.filter(k => k.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const item = db.addKnowledge(file.name, content.slice(0, 5000), 'file', file.name);
      setKnowledgeList([item, ...knowledgeList]);
    };
    reader.readAsText(file);
  };

  // Add Example
  const handleAddExample = () => {
    if (!newQuery.trim() || !newResponse.trim()) return;
    const item = db.addExample(newQuery, newResponse, newNotes, newCategory);
    setExamplesList([item, ...examplesList]);
    setNewQuery('');
    setNewResponse('');
    setNewNotes('');
  };

  const handleRateExample = (id: string, delta: number) => {
    db.updateExampleRating(id, delta);
    setExamplesList(db.getExamples());
  };

  const handleDeleteExample = (id: string) => {
    db.deleteExample(id);
    setExamplesList(examplesList.filter(e => e.id !== id));
  };

  // Export Training Dataset as JSON (Roadmap 1)
  const handleExportDataset = () => {
    const jsonStr = db.exportTrainingDataset();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boai-training-dataset-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Training Dataset (Roadmap 1)
  const handleImportDataset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = db.importTrainingDataset(text);
        if (success) {
          setPersonality(db.getPersonality());
          if (db.getPersonality().tuning) {
            setTuning(db.getPersonality().tuning!);
          }
          setExamplesList(db.getExamples());
          setKnowledgeList(db.getKnowledge());
          setImportStatus('นำเข้าชุดข้อมูลสำเร็จแล้ว!');
        } else {
          setImportStatus('ไฟล์ข้อมูลไม่ถูกต้อง');
        }
      } catch {
        setImportStatus('เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  // Test Lab Send with Latency Benchmark
  const handleTestLabSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim() || isTestThinking) return;

    const userText = testInput;
    setTestInput('');
    const newMsgs = [...testMessages, { role: 'user' as const, content: userText }];
    setTestMessages(newMsgs);
    setIsTestThinking(true);

    const startTime = performance.now();
    try {
      // Ensure latest tuning sliders & personality are committed so Test Lab uses them
      const latestPersonality: PersonalityConfig = {
        ...personality,
        tuning,
      };
      db.savePersonality(latestPersonality);

      const formattedForAI = newMsgs.map((m, idx) => ({
        id: `test_${idx}`,
        conversation_id: 'test',
        role: m.role,
        content: m.content,
        created_at: new Date().toISOString(),
      }));

      const reply = await aiService.chat(formattedForAI);
      const latency = Math.round(performance.now() - startTime);
      setTestMessages([
        ...newMsgs,
        { role: 'assistant', content: reply, latencyMs: latency, queryRef: userText },
      ]);
    } catch (err: any) {
      setTestMessages([...newMsgs, { role: 'assistant', content: `เกิดข้อผิดพลาด: ${err?.message}` }]);
    } finally {
      setIsTestThinking(false);
    }
  };

  // Promote Test Lab message into Few-Shot Example
  const handlePromoteToExample = (query: string, response: string) => {
    const newItem = db.addExample(query, response, 'สร้างจาก Test Lab Feedback', 'promoted');
    setExamplesList([newItem, ...examplesList]);
    setImportStatus('บันทึกเข้า Few-Shot Training แล้ว!');
    setTimeout(() => setImportStatus(null), 2500);
  };

  const filteredKnowledge = knowledgeList.filter(
    k =>
      k.title.toLowerCase().includes(searchKnowledge.toLowerCase()) ||
      k.content.toLowerCase().includes(searchKnowledge.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header & Export/Import Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Self-Training Studio</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-medium">
              Few-Shot & Persona Tuner
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            เทรนสไตล์การตอบคำถาม ปรับน้ำหนักบุคลิกภาพ จัดการ Few-Shot Dataset และทดสอบใน Live Test Lab
          </p>
        </div>

        {/* Dataset Export / Import Actions */}
        <div className="flex items-center gap-2">
          {importStatus && (
            <span className="text-xs text-emerald-400 font-medium animate-pulse flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {importStatus}
            </span>
          )}

          <button
            onClick={handleExportDataset}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            title="ส่งออกชุดข้อมูลการเทรนทั้งหมดเป็นไฟล์ JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            ส่งออก Dataset
          </button>

          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            นำเข้า Dataset
            <input type="file" accept=".json" onChange={handleImportDataset} className="hidden" />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
        {[
          { id: 'personality', label: 'บุคลิก & สไลเดอร์ปรับจูน', icon: Sliders },
          { id: 'examples', label: `Few-Shot Examples (${examplesList.length})`, icon: MessageCircle },
          { id: 'knowledge', label: `คลังความรู้ (${knowledgeList.length})`, icon: BookOpen },
          { id: 'testlab', label: 'Live Test Lab & Benchmark', icon: FlaskConical },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PERSONALITY & SPEAKING STYLE TUNER */}
      {activeTab === 'personality' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  สไลเดอร์ปรับสไตล์การพูด (Speaking Style Tuner)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ปรับระดับค่าน้ำหนักเพื่อคำนวณ System Prompt อัตโนมัติในทุกคำตอบ
                </p>
              </div>

              {personalitySaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" /> บันทึกเรียบร้อย
                </span>
              )}
            </div>

            {/* 4 Fine-Tuning Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#090D18] border border-white/5">
              {/* Wittiness / Humor */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">ความกวนและมุกตลก</span>
                  <span className="font-mono text-cyan-400 font-semibold">{tuning.wittiness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tuning.wittiness}
                  onChange={(e) => setTuning({ ...tuning, wittiness: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  {tuning.wittiness > 70
                    ? 'กวนมาก แซวเก่ง ไหวพริบมุกตลกเพียบ'
                    : tuning.wittiness > 40
                    ? 'หยอดมุกเล็กน้อย อารมณ์ดี'
                    : 'จริงจัง ไม่เล่นมุก'}
                </p>
              </div>

              {/* Friendliness */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">ความเป็นกันเอง (สนิทสนม)</span>
                  <span className="font-mono text-indigo-400 font-semibold">{tuning.friendliness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tuning.friendliness}
                  onChange={(e) => setTuning({ ...tuning, friendliness: Number(e.target.value) })}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  {tuning.friendliness > 70
                    ? 'เหมือนเพื่อนรักที่รู้ใจ อบอุ่น ใส่ใจมาก'
                    : tuning.friendliness > 40
                    ? 'เป็นกันเอง สบายๆ'
                    : 'สงวนท่าที เป็นทางการ'}
                </p>
              </div>

              {/* Formality */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">ระดับความเป็นทางการ</span>
                  <span className="font-mono text-violet-400 font-semibold">{tuning.formality}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tuning.formality}
                  onChange={(e) => setTuning({ ...tuning, formality: Number(e.target.value) })}
                  className="w-full accent-violet-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  {tuning.formality < 30
                    ? 'ภาษาพูดธรรมชาติ ไม่ประดิษฐ์คำ (ห้าม คะ/ขา แข็งๆ)'
                    : tuning.formality < 70
                    ? 'สุภาพ ปานกลาง'
                    : 'ทางการ สุภาพเรียบร้อย'}
                </p>
              </div>

              {/* Conciseness */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">ความกระชับ ตรงประเด็น</span>
                  <span className="font-mono text-emerald-400 font-semibold">{tuning.conciseness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tuning.conciseness}
                  onChange={(e) => setTuning({ ...tuning, conciseness: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  {tuning.conciseness > 70
                    ? 'ตอบสั้น ได้ใจความทันที ไม่เวิ่นเว้อ'
                    : tuning.conciseness > 40
                    ? 'ความยาวพอดี'
                    : 'อธิบายละเอียดทุกแง่มุม'}
                </p>
              </div>
            </div>

            {/* Basic Personality Info */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">ชื่อแสดงผลของผู้ช่วย</label>
                <input
                  type="text"
                  value={personality.name}
                  onChange={(e) => setPersonality({ ...personality, name: e.target.value })}
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">System Prompt พื้นฐาน</label>
                <textarea
                  rows={4}
                  value={personality.system_prompt}
                  onChange={(e) => setPersonality({ ...personality, system_prompt: e.target.value })}
                  className="w-full bg-[#111624] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 resize-none font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleSavePersonality}
              className="py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกการตั้งค่าบุคลิกภาพ & สไลเดอร์
            </button>
          </div>

          {/* Persona Card Preview */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ตัวอย่างโปรไฟล์ผู้ช่วย
            </h3>
            <div className="p-4 rounded-xl bg-[#0B0F19] border border-white/[0.06] flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white border border-white/20 p-1 flex items-center justify-center mb-3 shadow-md">
                <img src="/bobo.png" alt="Profile" className="w-full h-full object-contain" />
              </div>
              <p className="text-base font-bold text-white">{personality.name}</p>
              <p className="text-xs text-violet-400 mt-0.5">{personality.speaking_style}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  กวน {tuning.wittiness}%
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  เป็นกันเอง {tuning.friendliness}%
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  กระชับ {tuning.conciseness}%
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              เมื่อกดบันทึก ค่าน้ำหนักสไลเดอร์และบุคลิกภาพจะถูกนำไปประกอบคำตอบร่วมกับ Few-Shot Examples อัตโนมัติ
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: FEW-SHOT EXAMPLES */}
      {activeTab === 'examples' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  เพิ่มตัวอย่างการตอบ (Few-Shot Calibration)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  คู่คำถาม-คำตอบที่มีคะแนน Rating สูงสุด 4 อันดับแรก จะถูกฉีดเข้า System Prompt เพื่อกำหนดแนวทางตอบของ AI
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">ตัวอย่างคำถามจากผู้ใช้</label>
                <input
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="เช่น ไอ้โบ้ วันนี้เหนื่อยจังวะ มีเพลงชิลๆ ไหม?"
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">คำตอบที่โบ้ต้องตอบ (สไตล์ที่ถูกต้อง)</label>
                <input
                  type="text"
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="เช่น สู้ๆ นะแก! นั่งพักแป๊บ เดี๋ยวเปิด Lo-fi เบาๆ ให้นะ หายเหนื่อยแล้วค่อยลุยต่อ!"
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">หมวดหมู่ (Category)</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="general">ทั่วไป / สนทนา (General)</option>
                  <option value="weather">สภาพอากาศ (Weather)</option>
                  <option value="music">เพลงและมีเดีย (Music)</option>
                  <option value="work">งานและโค้ด (Work/Code)</option>
                  <option value="health">สุขภาพและอาหาร (Health)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">หมายเหตุพฤติกรรม (Optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="เช่น ห้ามตอบเป็นทางการ ให้กำลังใจแบบเพื่อนสนิท"
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <button
              onClick={handleAddExample}
              disabled={!newQuery.trim() || !newResponse.trim()}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มเข้าชุดตัวอย่าง
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                รายการตัวอย่างทั้งหมด ({examplesList.length}) — เรียงตามคะแนน Rating
              </h3>
              <span className="text-[11px] text-indigo-400">
                ⭐ 4 อันดับแรกมีอิทธิพลสูงสุดต่อสไตล์การตอบ
              </span>
            </div>

            <div className="space-y-3">
              {[...examplesList]
                .sort((a, b) => (b.rating ?? 5) - (a.rating ?? 5))
                .map((ex, index) => (
                  <div
                    key={ex.id}
                    className="glass-panel p-4 rounded-xl border border-white/[0.06] flex items-start justify-between gap-4 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          #{index + 1} คำถามผู้ใช้
                        </span>
                        <p className="text-xs font-medium text-slate-200">{ex.user_query}</p>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded shrink-0">
                          โบ้ตอบ
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">{ex.expected_response}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                        {ex.notes && <span className="italic">{ex.notes}</span>}
                        {ex.category && (
                          <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[10px]">
                            {ex.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thumbs Up / Down Score Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 bg-[#090D18] px-2 py-1 rounded-lg border border-white/10">
                        <button
                          onClick={() => handleRateExample(ex.id, 1)}
                          title="เพิ่มคะแนนความถูกต้อง"
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-xs font-bold text-slate-200 px-1">
                          {ex.rating ?? 5}
                        </span>
                        <button
                          onClick={() => handleRateExample(ex.id, -1)}
                          title="ลดคะแนน"
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteExample(ex.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors"
                        title="ลบตัวอย่าง"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">เพิ่มความรู้ใหม่ (Add Knowledge Item)</h2>
              <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                อัปโหลดไฟล์ (.txt, .md)
                <input type="file" accept=".txt,.md,.json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">หัวข้อเอกสาร / ชื่อความรู้</label>
                <input
                  type="text"
                  value={newKnowledgeTitle}
                  onChange={(e) => setNewKnowledgeTitle(e.target.value)}
                  placeholder="เช่น สเปคสินค้า, นโยบายบริษัท, โน้ตส่วนตัว"
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">เนื้อหาความรู้</label>
                <input
                  type="text"
                  value={newKnowledgeContent}
                  onChange={(e) => setNewKnowledgeContent(e.target.value)}
                  placeholder="พิมพ์ข้อความข้อมูลที่จะให้น้องโบจดจำและนำไปตอบคำถาม..."
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <button
              onClick={handleAddKnowledge}
              disabled={!newKnowledgeTitle.trim() || !newKnowledgeContent.trim()}
              className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มความรู้ลงระบบ
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchKnowledge}
                onChange={(e) => setSearchKnowledge(e.target.value)}
                placeholder="ค้นหาในคลังความรู้..."
                className="bg-transparent w-full focus:outline-none placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredKnowledge.map((k) => (
                <div
                  key={k.id}
                  className="glass-panel p-4 rounded-xl border border-white/[0.06] flex flex-col justify-between hover:border-cyan-500/30 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{k.title}</h4>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        แหล่งที่มา: {k.source === 'file' ? `ไฟล์ (${k.file_name})` : 'ป้อนข้อความ'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteKnowledge(k.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{k.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE TEST LAB & BENCHMARK */}
      {activeTab === 'testlab' && (
        <div className="h-[560px] flex flex-col justify-between glass-panel rounded-2xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Live Prompt Benchmark & Feedback Sandbox
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Real-time Latency Tracker Active</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-2">
            {testMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed space-y-2 ${
                    m.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-none'
                      : 'bg-[#0E1422] text-slate-200 border border-white/[0.08] rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Benchmark latency & Promote button */}
                  {m.role === 'assistant' && m.latencyMs && (
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                      <span className="font-mono text-emerald-400">ตอบกลับใน ~{m.latencyMs}ms</span>

                      {m.queryRef && (
                        <button
                          onClick={() => handlePromoteToExample(m.queryRef!, m.content)}
                          className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          บันทึกเป็น Few-Shot ทันที
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTestThinking && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 animate-pulse">
                <FlaskConical className="w-3.5 h-3.5" />
                กำลังจำลองคำตอบตาม Calibration Sliders...
              </div>
            )}
          </div>

          <form onSubmit={handleTestLabSend} className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="พิมพ์คำถามทดสอบพฤติกรรมและการตอบสนองของโบ้..."
              className="flex-1 bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              disabled={!testInput.trim() || isTestThinking}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              ทดสอบ
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
