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
  CornerDownLeft
} from 'lucide-react';
import { audioService } from '../services/audio/audioService';
import { db } from '../services/db/databaseService';

export const Conversation: React.FC = () => {
  const {
    messages,
    sendMessage,
    clearConversation,
    state,
    startVoiceInteraction,
    isAlwaysListening,
  } = useAssistantStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
            สนทนาด้วยเสียงหรือพิมพ์ข้อความสำรอง • รองรับบริบทความจำแบบเรียลไทม์
          </p>
        </div>

        <button
          onClick={clearConversation}
          title="ล้างประวัติการสนทนานี้"
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          ล้างประวัติ
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 p-2 border border-white/10 flex items-center justify-center mb-3 shadow-sm">
              <img src="/assets/images/dog.png" alt="Bo AI Dog" className="w-full h-full object-contain" />
            </div>
            <p className="text-sm font-medium text-slate-300">ยังไม่มีข้อความในการสนทนานี้</p>
            <p className="text-xs text-slate-500 mt-1">
              เรียก "โบ้" หรือพิมพ์ข้อความในกล่องด้านล่างเพื่อเริ่มคุยได้ทันที
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    <img src="/assets/images/dog.png" alt="Bo AI" className="w-full h-full object-contain" />
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
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                      {isUser ? 'คุณ' : 'โบ้'}
                    </span>
                    <span className="text-[10px] text-slate-500">
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
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <User className="w-4 h-4" />
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
              น้องโบกำลังประมวลผลคำตอบ...
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
              กำลังรอฟังเสียงของคุณ... (พูดได้เลยค่ะ)
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box & Voice Button */}
      <form
        onSubmit={handleSend}
        className="glass-panel p-2 rounded-2xl border border-white/[0.08] flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={startVoiceInteraction}
          title="กดเพื่อสั่งการด้วยเสียง"
          className={`p-3 rounded-xl transition-all duration-200 shrink-0 ${
            state === 'listening'
              ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(0,240,255,0.6)] animate-pulse'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ข้อความคุยกับน้องโบ หรือกดไมค์เพื่อสั่งด้วยเสียง..."
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
