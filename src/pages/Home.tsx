import React, { useMemo } from 'react';
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
  const setActiveTab = useAssistantStore((s) => s.setActiveTab);
  const startVoiceInteraction = useAssistantStore((s) => s.startVoiceInteraction);
  const grokQuota = useAssistantStore((s) => s.grokQuota);

  const settings = useMemo(() => db.getSettings(), []);
  const personality = useMemo(() => db.getPersonality(), []);
  const memoryCount = useMemo(() => db.getMemories().length, []);
  const knowledgeCount = useMemo(() => db.getKnowledge().length, []);

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
      <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A]">
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
      <div className="relative w-full flex flex-col items-center">
        <AiOrbVisualizer />
      </div>

      {/* Metric & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Wake Word */}
        <div
          onClick={() => setActiveTab('voice')}
          className="glass-panel p-4 rounded-xl border border-[#2A2A2A] hover:border-[#38BDF8]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-slate-400">คำเรียก Wake Word</span>
            <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-normal text-white mt-2 font-mono">
            "{settings.wake_word}"
          </p>
          <p className="text-xs font-normal text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-cyan-400">ความไว {settings.sensitivity}%</span> • ไมค์พร้อม
          </p>
        </div>

        {/* Card 2: Memory Bank */}
        <div
          onClick={() => setActiveTab('memory')}
          className="glass-panel p-4 rounded-xl border border-[#2A2A2A] hover:border-indigo-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-slate-400">คลังความจำ</span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-normal text-white mt-2 font-mono">
            {memoryCount} รายการ
          </p>
          <p className="text-xs font-normal text-slate-400 mt-1">
            ความจำส่วนตัวในเครื่อง
          </p>
        </div>

        {/* Card 3: Knowledge Base */}
        <div
          onClick={() => setActiveTab('training')}
          className="glass-panel p-4 rounded-xl border border-[#2A2A2A] hover:border-violet-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-slate-400">ฐานความรู้</span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-normal text-white mt-2 font-mono">
            {knowledgeCount} เอกสาร
          </p>
          <p className="text-xs font-normal text-slate-400 mt-1 truncate">
            สไตล์: {personality.speaking_style.slice(0, 20)}
          </p>
        </div>

        {/* Card 4: Security & Privacy */}
        <div
          onClick={() => setActiveTab('settings')}
          className="glass-panel p-4 rounded-xl border border-[#2A2A2A] hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-slate-400">ความปลอดภัย</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-normal text-emerald-400 mt-2 font-mono">
            ความเป็นส่วนตัว 100%
          </p>
          <p className="text-xs font-normal text-slate-400 mt-1">
            รันในเครื่อง ไม่ส่งออกภายนอก
          </p>
        </div>
      </div>
    </div>
  );
};
