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
  Search,
  Check,
  Send,
  Bot,
  User,
  Sliders
} from 'lucide-react';
import { db } from '../../services/db/databaseService';
import { aiService } from '../../services/ai/aiService';
import { ExampleTrainingItem, KnowledgeItem, PersonalityConfig } from '../../types';

export const TrainingStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personality' | 'knowledge' | 'examples' | 'testlab'>('personality');

  // Personality State
  const [personality, setPersonality] = useState<PersonalityConfig>(db.getPersonality());
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

  // Test Lab State
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'สวัสดีค่ะ! ยินดีต้อนรับสู่ห้องทดลอง Test Lab คุณสามารถทดสอบถามคำถามเพื่อตรวจดูการตอบสนองตามบุคลิกและความรู้ที่ตั้งไว้ได้เลยค่ะ' }
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTestThinking, setIsTestThinking] = useState(false);

  // Load initial data
  useEffect(() => {
    setPersonality(db.getPersonality());
    setKnowledgeList(db.getKnowledge());
    setExamplesList(db.getExamples());
  }, []);

  // Save Personality
  const handleSavePersonality = () => {
    db.savePersonality(personality);
    setPersonalitySaved(true);
    setTimeout(() => setPersonalitySaved(false), 2000);
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
    const item = db.addExample(newQuery, newResponse, newNotes);
    setExamplesList([item, ...examplesList]);
    setNewQuery('');
    setNewResponse('');
    setNewNotes('');
  };

  const handleDeleteExample = (id: string) => {
    db.deleteExample(id);
    setExamplesList(examplesList.filter(e => e.id !== id));
  };

  // Test Lab Send
  const handleTestLabSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim() || isTestThinking) return;

    const userText = testInput;
    setTestInput('');
    const newMsgs = [...testMessages, { role: 'user' as const, content: userText }];
    setTestMessages(newMsgs);
    setIsTestThinking(true);

    try {
      const formattedForAI = newMsgs.map((m, idx) => ({
        id: `test_${idx}`,
        conversation_id: 'test',
        role: m.role,
        content: m.content,
        created_at: new Date().toISOString()
      }));

      const reply = await aiService.chat(formattedForAI);
      setTestMessages([...newMsgs, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setTestMessages([...newMsgs, { role: 'assistant', content: `เกิดข้อผิดพลาด: ${err?.message}` }]);
    } finally {
      setIsTestThinking(false);
    }
  };

  const filteredKnowledge = knowledgeList.filter(k =>
    k.title.toLowerCase().includes(searchKnowledge.toLowerCase()) ||
    k.content.toLowerCase().includes(searchKnowledge.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Training Studio
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
              Calibration Center
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            ปรับแต่งบุคลิก, นำเข้าฐานความรู้, เพิ่มตัวอย่างคำถาม-คำตอบ และทดสอบในห้องแล็บ
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
        {[
          { id: 'personality', label: 'บุคลิก (Personality)', icon: UserCheck },
          { id: 'knowledge', label: `ฐานความรู้ (${knowledgeList.length})`, icon: BookOpen },
          { id: 'examples', label: `ตัวอย่างคำตอบ (${examplesList.length})`, icon: MessageCircle },
          { id: 'testlab', label: 'Test Lab (ห้องทดสอบ)', icon: FlaskConical },
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

      {/* TAB 1: PERSONALITY */}
      {activeTab === 'personality' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">ตั้งค่าบุคลิกภาพ (Personality Config)</h2>
              {personalitySaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> บันทึกแล้ว
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">ชื่อแสดงผลของผู้ช่วย</label>
              <input
                type="text"
                value={personality.name}
                onChange={(e) => setPersonality({ ...personality, name: e.target.value })}
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">สไตล์การพูด (Speaking Style)</label>
              <input
                type="text"
                value={personality.speaking_style}
                onChange={(e) => setPersonality({ ...personality, speaking_style: e.target.value })}
                placeholder="เช่น อ่อนหวาน เป็นกันเอง พูดลงท้ายด้วย คะ/ขา"
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">ระดับความเป็นทางการ (Formality Level)</span>
                <span className="font-mono text-violet-400 font-semibold">
                  {personality.formality_level}/5 ({personality.formality_level <= 2 ? 'สนิทสนม' : personality.formality_level === 3 ? 'สุภาพเป็นกันเอง' : 'ทางการ'})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={personality.formality_level}
                onChange={(e) => setPersonality({ ...personality, formality_level: Number(e.target.value) })}
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">System Prompt หลัก</label>
              <textarea
                rows={5}
                value={personality.system_prompt}
                onChange={(e) => setPersonality({ ...personality, system_prompt: e.target.value })}
                className="w-full bg-[#111624] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 resize-none font-mono"
              />
            </div>

            <button
              onClick={handleSavePersonality}
              className="py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกบุคลิกภาพ
            </button>
          </div>

          {/* Persona Card Preview */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ตัวอย่างโปรไฟล์ผู้ช่วย
            </h3>
            <div className="p-4 rounded-xl bg-surface-elevated border border-white/[0.06] flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-900 border border-white/20 p-1 flex items-center justify-center mb-3 shadow-md">
                <img src="/assets/images/dog.png" alt="Profile" className="w-full h-full object-contain" />
              </div>
              <p className="text-base font-bold text-white">{personality.name}</p>
              <p className="text-xs text-violet-400 mt-0.5">{personality.speaking_style}</p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  ความเป็นทางการ {personality.formality_level}/5
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  ระบบเสียงไทย
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              เมื่อบันทึกแล้ว บุคลิกภาพนี้จะถูกฉีดเข้าสู่ System Prompt ทุกครั้งที่มีการสนทนาทั้งแบบเสียงและข้อความ
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Add knowledge form */}
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">หัวข้อเอกสาร / ชื่อความรู้</label>
                <input
                  type="text"
                  value={newKnowledgeTitle}
                  onChange={(e) => setNewKnowledgeTitle(e.target.value)}
                  placeholder="เช่น สเปคสินค้า, นโยบายบริษัท, โน้ตส่วนตัว"
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="space-y-2">
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
              className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มความรู้ลงระบบ
            </button>
          </div>

          {/* Search bar & list */}
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
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {k.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXAMPLE TRAINING */}
      {activeTab === 'examples' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <h2 className="text-sm font-semibold text-white">
              เพิ่มตัวอย่างคำถาม-คำตอบ (Few-shot Calibration)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">ตัวอย่างคำถามจากผู้ใช้</label>
                <input
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="เช่น น้องโบ ช่วยเตือนฉันก่อนนอนหน่อย"
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">คำตอบที่ต้องการให้น้องโบตอบ</label>
                <input
                  type="text"
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="เช่น ได้เลยค่ะ จะเตือนตอน 22:00 น. ให้นะคะ ฝันดีล่วงหน้าค่ะ"
                  className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">หมายเหตุ / คำแนะนำพฤติกรรม (Optional)</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="เช่น ตอบด้วยความสุภาพ อบอุ่น และใส่ใจสุขภาพ"
                className="w-full bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <button
              onClick={handleAddExample}
              disabled={!newQuery.trim() || !newResponse.trim()}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มตัวอย่างคำตอบ
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              รายการตัวอย่างคำตอบทั้งหมด ({examplesList.length})
            </h3>
            <div className="space-y-3">
              {examplesList.map((ex) => (
                <div
                  key={ex.id}
                  className="glass-panel p-4 rounded-xl border border-white/[0.06] flex items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        คำถามผู้ใช้
                      </span>
                      <p className="text-xs font-medium text-slate-200">{ex.user_query}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded shrink-0">
                        คำตอบน้องโบ
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">{ex.expected_response}</p>
                    </div>
                    {ex.notes && (
                      <p className="text-[11px] text-slate-500 italic pl-1">
                        บันทึกพฤติกรรม: {ex.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteExample(ex.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TEST LAB */}
      {activeTab === 'testlab' && (
        <div className="h-[520px] flex flex-col justify-between glass-panel rounded-2xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Interactive Calibration Sandbox (พิมพ์สนทนา ไม่ใช้เสียง)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              สถานะ: พร้อมจำลองบทสนทนา
            </span>
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
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-none'
                      : 'bg-surface-elevated text-slate-200 border border-white/[0.06] rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
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
                กำลังจำลองคำตอบตาม Calibration...
              </div>
            )}
          </div>

          <form onSubmit={handleTestLabSend} className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="พิมพ์คำถามทดสอบพฤติกรรมของน้องโบ..."
              className="flex-1 bg-[#111624] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              disabled={!testInput.trim() || isTestThinking}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
