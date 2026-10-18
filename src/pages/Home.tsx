import React from 'react';
import { AiOrbVisualizer } from '../components/AiOrbVisualizer';
import { useAssistantStore } from '../stores/useAssistantStore';
import {
  Mic,
  MessageSquare,
  Sliders,
  ShieldCheck,
  BrainCircuit,
  Zap,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { db } from '../services/db/databaseService';

export const Home: React.FC = () => {
  const { setActiveTab, startVoiceInteraction, messages, grokQuota } = useAssistantStore();
  const settings = db.getSettings();
  const personality = db.getPersonality();
  const memories = db.getMemories();
  const knowledge = db.getKnowledge();

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  const getModelDisplayName = () => {
    switch (settings.llm_provider) {
      case 'grok':
        return `xAI Grok (${settings.grok_model || 'grok-2-latest'})`;
      case 'meta':
        return `Groq / Meta (${(settings.meta_model || 'openai/gpt-oss-120b').replace('openai/', '')})`;
      case 'openai':
        return `OpenAI (${settings.openai_model || 'gpt-4o'})`;
      case 'claude':
        return `Claude (${settings.claude_model || 'claude-3-5-sonnet'})`;
      case 'gemini':
      default:
        return `Google Gemini (${settings.gemini_model || 'gemini-flash-lite'})`;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {personality.name}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Desktop AI Assistant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center flex-wrap gap-2">
            <span>คำเรียกหลัก: <span className="text-cyan-400 font-medium">"{settings.wake_word}"</span></span>
            <span>•</span>
            <span>โมเดลหลัก: <span className="text-indigo-400 font-medium">{getModelDisplayName()}</span></span>
            {settings.llm_provider === 'grok' && grokQuota && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                grokQuota.status === 'exhausted'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : grokQuota.status === 'near_limit'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {grokQuota.status === 'exhausted'
                  ? 'โควต้า Grok หมด (Auto-fallback Gemini)'
                  : grokQuota.status === 'near_limit'
                  ? `โควต้า Grok ใกล้หมด (เหลือ ${grokQuota.remainingRequests} ครั้ง)`
                  : `โควต้า Grok ปกติ (${grokQuota.remainingRequests ?? 'OK'})`}
              </span>
            )}
          </p>
        </div>

        {/* Fast Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('conversation')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            เปิดหน้าแชท
          </button>
          <button
            onClick={startVoiceInteraction}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" />
            สั่งงานด้วยเสียงทันที
          </button>
        </div>
      </div>

      {/* Main Center AI Companion */}
      <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] relative overflow-hidden flex flex-col items-center">
        <AiOrbVisualizer />

        {/* Last message callout */}
        {lastMessage && (
          <div className="mt-4 max-w-lg w-full p-3 rounded-xl bg-surface-elevated/70 border border-white/[0.06] flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-white p-0.5 border border-white/20 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <img src="/bobo.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-semibold text-slate-400">
                ข้อความล่าสุด ({lastMessage.role === 'assistant' ? 'โนอา' : 'คุณ'})
              </p>
              <p className="text-xs text-slate-200 truncate mt-0.5">
                {lastMessage.content}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('conversation')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0"
            >
              ดูแชท <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Metric & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Wake Word */}
        <div
          onClick={() => setActiveTab('voice')}
          className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-cyan-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">คำสั่ง Wake Word</span>
            <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-white mt-2 font-mono">
            "{settings.wake_word}"
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-cyan-400">ความไว {settings.sensitivity}%</span> • ไมค์พร้อม
          </p>
        </div>

        {/* Card 2: Memory Bank */}
        <div
          onClick={() => setActiveTab('memory')}
          className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-indigo-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">คลังความจำ (Memory)</span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-white mt-2 font-mono">
            {memories.length} รายการ
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            ความจำส่วนตัว & รสนิยมในเครื่อง
          </p>
        </div>

        {/* Card 3: Knowledge Base */}
        <div
          onClick={() => setActiveTab('training')}
          className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-violet-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">ฐานความรู้ (Knowledge)</span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-white mt-2 font-mono">
            {knowledge.length} เอกสาร
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            บุคลิก: {personality.speaking_style.slice(0, 15)}...
          </p>
        </div>

        {/* Card 4: Security & Privacy */}
        <div
          onClick={() => setActiveTab('settings')}
          className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">ความปลอดภัย</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-400 mt-2 font-mono">
            Privacy 100%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            ฐานข้อมูล SQLite รันในเครื่อง
          </p>
        </div>
      </div>
    </div>
  );
};
