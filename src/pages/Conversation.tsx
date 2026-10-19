import React, { useState, useRef, useEffect } from 'react';
import { useAssistantStore } from '../stores/useAssistantStore';
import {
  Send,
  Mic,
  Trash2,
  User,
  Bot,
  Volume2,
  Loader2,
  CornerDownLeft,
  Sparkles,
  AlertTriangle,
  Check,
  X,
  Edit2,
  BookOpen,
  GraduationCap,
  CheckCircle2
} from 'lucide-react';
import { audioService } from '../services/audio/audioService';
import { db } from '../services/db/databaseService';

export const Conversation: React.FC = () => {
  const messages = useAssistantStore((s) => s.messages);
  const sendMessage = useAssistantStore((s) => s.sendMessage);
  const clearConversation = useAssistantStore((s) => s.clearConversation);
  const state = useAssistantStore((s) => s.state);
  const startVoiceInteraction = useAssistantStore((s) => s.startVoiceInteraction);
  const resolvePendingMemory = useAssistantStore((s) => s.resolvePendingMemory);

  const [input, setInput] = useState('');
  const [editingPendingFact, setEditingPendingFact] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [quickTeachMsgId, setQuickTeachMsgId] = useState<string | null>(null);
  const [teachUserQuery, setTeachUserQuery] = useState('');
  const [teachResponse, setTeachResponse] = useState('');
  const [teachCategory, setTeachCategory] = useState('general');
  const [teachNotes, setTeachNotes] = useState('สอนตรงจากห้องแชท');
  const [teachSavedToast, setTeachSavedToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleOpenQuickTeach = (msg: import('../types').ChatMessage, idx: number) => {
    let userQuery = '';
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = messages[i].content;
        break;
      }
    }
    setTeachUserQuery(userQuery || 'คำถามของคุณ');
    setTeachResponse(msg.content);
    setTeachCategory('general');
    setTeachNotes('สอนตรงจากห้องแชท');
    setQuickTeachMsgId(quickTeachMsgId === msg.id ? null : msg.id);
  };

  const handleSaveQuickTeach = () => {
    if (!teachUserQuery.trim() || !teachResponse.trim()) return;
    db.addExample(teachUserQuery.trim(), teachResponse.trim(), teachNotes.trim(), teachCategory);
    setQuickTeachMsgId(null);
    setTeachSavedToast('บันทึกตัวอย่างการเทรนสำเร็จ! โนอาจะจำคำตอบและสไตล์นี้ไปใช้ตอบครั้งถัดไปทันที ✨');
    setTimeout(() => {
      setTeachSavedToast(null);
    }, 3500);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, state]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || state === 'thinking' || isSubmitting) return;
    const text = input.trim();
    setInput('');
    setIsSubmitting(true);
    try {
      await sendMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayMessageAudio = (text: string) => {
    audioService.speak(text);
  };

  return (
    <div className="h-full flex flex-col justify-between p-6">
      {/* Quick Teach Success Toast Banner */}
      {teachSavedToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#141b2d] border border-indigo-500/40 text-white text-xs font-medium shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-100">{teachSavedToast}</span>
        </div>
      )}

      {/* Top Header of Chat */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              การสนทนา (Conversation)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {messages.length} ข้อความ
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            สนทนาด้วยเสียงหรือพิมพ์ข้อความ • ระบบสกัดความจำและตรวจจับความขัดแย้งอัตโนมัติ
          </p>
        </div>

        <button
          onClick={clearConversation}
          title="ล้างประวัติการสนทนานี้"
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
          ล้างประวัติ
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-white/20 flex items-center justify-center mb-3 shadow-md">
              <img src="/bobo.png" alt="Noar AI" className="w-full h-full object-contain" />
            </div>
            <p className="text-sm font-medium text-slate-300">ยังไม่มีข้อความในการสนทนานี้</p>
            <p className="text-xs text-slate-500 mt-1">
              เรียก "โนอา" หรือพิมพ์ข้อความในกล่องด้านล่างเพื่อเริ่มคุยได้ทันที
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const pending = msg.pending_memory;

            return (
              <div key={msg.id} className="space-y-2">
                <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-white border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img src="/bobo.png" alt="Noar AI" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all shadow-sm ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-none border border-blue-400/30'
                        : 'bg-[#131926] text-slate-200 rounded-bl-none border border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                          {isUser ? 'คุณ' : 'โนอา'}
                        </span>
                        {!isUser && msg.training_source === 'few_shot' && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[9px] font-semibold flex items-center gap-1 shadow-sm"
                            title="คำตอบนี้ถูกตอบตรงตามตัวอย่าง Few-Shot ที่คุณเทรนไว้ (ความแม่นยำ 100%)"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            Few-Shot Trained
                          </span>
                        )}
                        {!isUser && msg.training_source === 'knowledge' && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-semibold flex items-center gap-1 shadow-sm"
                            title={`อ้างอิงจากคลังความรู้: ${msg.training_label || ''}`}
                          >
                            <BookOpen className="w-2.5 h-2.5 text-emerald-400" />
                            คลังความรู้{msg.training_label ? `: ${msg.training_label.slice(0, 20)}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.created_at).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {!isUser && (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                        <button
                          onClick={() => handlePlayMessageAudio(msg.content)}
                          className="flex items-center gap-1 hover:text-cyan-300 transition-colors text-[11px]"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          อ่านออกเสียง
                        </button>
                        <button
                          onClick={() => handleOpenQuickTeach(msg, idx)}
                          className={`flex items-center gap-1 transition-colors text-[11px] ${
                            quickTeachMsgId === msg.id
                              ? 'text-indigo-300 font-medium'
                              : 'text-slate-400 hover:text-indigo-300'
                          }`}
                          title="แก้ไขและบันทึกคำตอบนี้เป็นตัวอย่างการเทรน Few-Shot เพื่อให้โนอาตอบแบบนี้ในอนาคต"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                          สอนโนอา (เทรนคำตอบนี้)
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Inline Quick-Teach Drawer for this assistant response */}
                {!isUser && quickTeachMsgId === msg.id && (
                  <div className="ml-11 max-w-[80%] p-3.5 rounded-2xl bg-[#0f1523] border border-indigo-500/40 shadow-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                        <GraduationCap className="w-4 h-4 text-indigo-400" />
                        <span>สอนโนอา • บันทึกเป็นตัวอย่าง Few-Shot</span>
                      </div>
                      <button
                        onClick={() => setQuickTeachMsgId(null)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">คำถามของผู้ใช้ (Trigger Query):</label>
                      <input
                        type="text"
                        value={teachUserQuery}
                        onChange={(e) => setTeachUserQuery(e.target.value)}
                        placeholder="พิมพ์คำถามที่ต้องการให้โนอาจำ..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">คำตอบที่ต้องการให้โนอาตอบ (Expected Response):</label>
                      <textarea
                        rows={3}
                        value={teachResponse}
                        onChange={(e) => setTeachResponse(e.target.value)}
                        placeholder="พิมพ์คำตอบที่ต้องการให้โนอาตอบแบบเป๊ะๆ..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 font-medium">หมวดหมู่:</label>
                        <select
                          value={teachCategory}
                          onChange={(e) => setTeachCategory(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                        >
                          <option value="general">ทั่วไป</option>
                          <option value="personality">บุคลิกภาพ & ความกวน</option>
                          <option value="music">ดนตรีและเพลง</option>
                          <option value="weather">สภาพอากาศ</option>
                          <option value="work">งานและชีวิตประจำวัน</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 font-medium">บันทึกช่วยจำ:</label>
                        <input
                          type="text"
                          value={teachNotes}
                          onChange={(e) => setTeachNotes(e.target.value)}
                          placeholder="โน้ตช่วยจำ..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setQuickTeachMsgId(null)}
                        className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveQuickTeach}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        บันทึกเป็น Few-Shot ทันที
                      </button>
                    </div>
                  </div>
                )}

                {/* Strict Interactive Fact / Conflict Confirmation Card */}
                {pending && (
                  <div
                    className={`mx-auto max-w-[85%] p-3.5 rounded-2xl border transition-all shadow-md ${
                      pending.type === 'conflict'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {pending.type === 'conflict' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      )}

                      <div className="space-y-1.5 flex-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white">
                            {pending.type === 'conflict'
                              ? 'ตรวจพบข้อมูลขัดแย้งกับความจำเดิม'
                              : 'ตรวจพบข้อเท็จจริงใหม่ของคุณ'}
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                            ความมั่นใจ {pending.confidence}%
                          </span>
                        </div>

                        {pending.type === 'conflict' && pending.existing_content && (
                          <div className="p-2 rounded-lg bg-black/30 border border-amber-500/20 text-[11px] text-amber-300/90">
                            ความจำเดิม: "{pending.existing_content}"
                          </div>
                        )}

                        {editingPendingFact === pending.id ? (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={editedText}
                              onChange={(e) => setEditedText(e.target.value)}
                              className="flex-1 bg-black/40 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                resolvePendingMemory('edit', editedText);
                                setEditingPendingFact(null);
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => setEditingPendingFact(null)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-300">
                            {pending.type === 'conflict'
                              ? `ต้องการอัปเดตแทนที่ด้วย: "${pending.fact}" หรือไม่?`
                              : `ต้องการให้โนอาจำเรื่องนี้ไว้ไหม: "${pending.fact}"?`}
                          </p>
                        )}

                        {/* Interactive Buttons */}
                        {editingPendingFact !== pending.id && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => resolvePendingMemory('confirm')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              {pending.type === 'conflict' ? 'อัปเดตแทนที่' : 'จำเรื่องนี้เลย'}
                            </button>

                            <button
                              onClick={() => {
                                setEditingPendingFact(pending.id);
                                setEditedText(pending.fact);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              แก้ไขข้อความ
                            </button>

                            <button
                              onClick={() => resolvePendingMemory('dismiss')}
                              className="px-2.5 py-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[11px] transition-colors"
                            >
                              ไม่ต้องจำ
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* State Indicators in Chat */}
        {state === 'thinking' && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-[#131926] border border-white/[0.08] text-xs text-indigo-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              โนอากำลังประมวลผลคำตอบ...
            </div>
          </div>
        )}

        {state === 'listening' && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-[#131926] border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              กำลังรอฟังเสียงของคุณ... (พูดได้เลยนะ)
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box & Voice Button */}
      <form
        onSubmit={handleSend}
        className="glass-panel p-2 rounded-2xl border border-white/[0.08] flex items-center gap-2 shrink-0 shadow-lg"
      >
        <button
          type="button"
          onClick={startVoiceInteraction}
          title={state === 'speaking' ? 'กดเพื่อขัดจังหวะโนอา (พูดขัดได้เลยค่ะ)' : 'กดเพื่อสั่งการด้วยเสียง'}
          className={`p-3 rounded-xl transition-all duration-200 shrink-0 ${
            state === 'listening'
              ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(0,240,255,0.6)] animate-pulse'
              : state === 'speaking'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ข้อความคุยกับโนอา หรือกดไมค์เพื่อสั่งด้วยเสียง..."
          className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!input.trim() || state === 'thinking'}
          className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shrink-0 ${
            input.trim() && state !== 'thinking'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
              : 'bg-white/5 text-slate-600 cursor-not-allowed'
          }`}
        >
          <span>ส่ง</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
