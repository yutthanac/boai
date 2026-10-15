import React from 'react';
import { useAssistantStore } from '../stores/useAssistantStore';
import { Mic, Volume2, Loader2 } from 'lucide-react';

export const AiOrbVisualizer: React.FC = () => {
  const { state, startVoiceInteraction, isMuted } = useAssistantStore();

  const getStatusInfo = () => {
    switch (state) {
      case 'listening':
        return {
          ring: 'border-cyan-400 ring-4 ring-cyan-500/20',
          textColor: 'text-cyan-400',
          status: 'กำลังฟังเสียงคำสั่ง...',
          badge: 'LISTENING',
        };
      case 'thinking':
        return {
          ring: 'border-blue-400 ring-4 ring-blue-500/20',
          textColor: 'text-blue-400',
          status: 'กำลังประมวลผลคำตอบ...',
          badge: 'THINKING',
        };
      case 'speaking':
        return {
          ring: 'border-emerald-400 ring-4 ring-emerald-500/20',
          textColor: 'text-emerald-400',
          status: 'กำลังพูดตอบกลับ...',
          badge: 'SPEAKING',
        };
      default:
        return {
          ring: 'border-slate-700 hover:border-slate-500',
          textColor: 'text-slate-300',
          status: 'กดรูปเพื่อเริ่มพูด หรือเรียกคำสั่งเสียง',
          badge: 'READY',
        };
    }
  };

  const info = getStatusInfo();

  return (
    <div className="flex flex-col items-center justify-center py-5 select-none">
      {/* Interactive Avatar Container */}
      <button
        type="button"
        onClick={() => {
          if (!isMuted && state === 'idle') {
            startVoiceInteraction();
          }
        }}
        disabled={state === 'thinking' || state === 'speaking'}
        className={`relative w-40 h-40 rounded-full p-1.5 bg-[#141c2e] border-2 transition-all duration-200 cursor-pointer focus:outline-none ${info.ring} shadow-lg group`}
      >
        {/* Dog Avatar Image */}
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center border border-white/10 relative">
          <img
            src="/assets/images/dog.png"
            alt="Bo AI Companion"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />

          {/* Clean State Overlay Icon */}
          {state === 'thinking' && (
            <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          )}

          {state === 'listening' && (
            <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-cyan-500 text-slate-950 shadow-md">
              <Mic className="w-4 h-4" />
            </div>
          )}

          {state === 'speaking' && (
            <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-emerald-500 text-slate-950 shadow-md">
              <Volume2 className="w-4 h-4" />
            </div>
          )}
        </div>
      </button>

      {/* Clean Status & Helper */}
      <div className="mt-4 text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {info.badge}
          </span>
          <p className={`text-sm font-medium ${info.textColor}`}>
            {info.status}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          คำเรียก: "โบ้" • ตอบสนองฉับไว
        </p>
      </div>
    </div>
  );
};
