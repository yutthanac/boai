import React from 'react';
import { useAssistantStore } from '../stores/useAssistantStore';
import { Mic, Volume2, Sparkles, Loader2 } from 'lucide-react';

export const AiOrbVisualizer: React.FC = () => {
  const { state, startVoiceInteraction, isMuted } = useAssistantStore();

  const getOrbTheme = () => {
    switch (state) {
      case 'listening':
        return {
          glow: 'from-cyan-500 via-sky-400 to-indigo-500 shadow-[0_0_80px_rgba(0,240,255,0.6)] animate-pulse',
          inner: 'bg-cyan-950/80 border-cyan-400/50',
          textColor: 'text-cyan-300',
          status: 'กำลังฟังเสียงคำสั่ง...',
          icon: Mic,
        };
      case 'thinking':
        return {
          glow: 'from-violet-600 via-purple-500 to-indigo-600 shadow-[0_0_90px_rgba(139,92,246,0.6)] animate-spin-slow',
          inner: 'bg-purple-950/80 border-purple-400/50',
          textColor: 'text-purple-300',
          status: 'กำลังคิดและประมวลผล...',
          icon: Loader2,
        };
      case 'speaking':
        return {
          glow: 'from-emerald-500 via-teal-400 to-cyan-500 shadow-[0_0_80px_rgba(16,185,129,0.55)] animate-pulse',
          inner: 'bg-emerald-950/80 border-emerald-400/50',
          textColor: 'text-emerald-300',
          status: 'กำลังพูดตอบกลับ...',
          icon: Volume2,
        };
      default:
        return {
          glow: 'from-indigo-600/70 via-indigo-500/40 to-cyan-500/30 shadow-[0_0_50px_rgba(99,102,241,0.35)]',
          inner: 'bg-indigo-950/50 border-indigo-500/30',
          textColor: 'text-slate-300',
          status: 'กด Orb หรือเรียก "น้องโบ"',
          icon: Sparkles,
        };
    }
  };

  const theme = getOrbTheme();
  const Icon = theme.icon;

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      {/* Outer Glow Halo Rings */}
      <div className="relative flex items-center justify-center">
        {/* Animated Ripple 1 */}
        {state === 'listening' && (
          <div className="absolute w-64 h-64 rounded-full border border-cyan-400/30 animate-ping duration-1000" />
        )}
        {state === 'thinking' && (
          <div className="absolute w-60 h-60 rounded-full border border-dashed border-purple-400/40 animate-spin" />
        )}
        {state === 'speaking' && (
          <div className="absolute w-60 h-60 rounded-full border border-emerald-400/30 animate-pulse duration-700" />
        )}

        {/* Ambient Backlight */}
        <div
          className={`absolute w-48 h-48 rounded-full bg-gradient-to-tr ${theme.glow} opacity-60 blur-2xl transition-all duration-700`}
        />

        {/* Core Interactive Orb */}
        <button
          onClick={() => {
            if (!isMuted && state === 'idle') {
              startVoiceInteraction();
            }
          }}
          disabled={state === 'thinking' || state === 'speaking'}
          className={`relative w-44 h-44 rounded-full p-[2px] bg-gradient-to-tr ${theme.glow} transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer group focus:outline-none`}
        >
          {/* Inner Spherical Body */}
          <div
            className={`w-full h-full rounded-full ${theme.inner} backdrop-blur-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500`}
          >
            {/* Shimmer light reflection */}
            <div className="absolute top-2 left-6 w-16 h-8 bg-white/20 rounded-full blur-md -rotate-12 pointer-events-none" />

            {/* Dynamic Center Graphic */}
            <div className="flex flex-col items-center gap-2 z-10">
              <Icon
                className={`w-9 h-9 ${theme.textColor} transition-all duration-300 ${
                  state === 'thinking' ? 'animate-spin' : 'group-hover:scale-110'
                }`}
              />
              <span className="text-[11px] font-semibold tracking-wider text-slate-200">
                {state === 'idle' ? 'NONG BO' : state.toUpperCase()}
              </span>
            </div>

            {/* Audio Wave Bars when speaking or listening */}
            {(state === 'speaking' || state === 'listening') && (
              <div className="absolute bottom-6 flex items-center gap-1">
                {[0.4, 0.9, 0.6, 1.0, 0.7, 0.3].map((height, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${height * 18}px`,
                      animationDelay: `${i * 120}ms`,
                    }}
                    className={`w-1 rounded-full ${
                      state === 'listening' ? 'bg-cyan-400' : 'bg-emerald-400'
                    } animate-pulse`}
                  />
                ))}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Subtitle status below Orb */}
      <div className="mt-5 text-center">
        <p className={`text-sm font-medium ${theme.textColor} transition-colors duration-300`}>
          {theme.status}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {state === 'idle'
            ? 'ความไว Wake Word: 75% • ไมค์ทำงานปกติ'
            : 'ระบบกำลังทำงานแบบเรียลไทม์'}
        </p>
      </div>
    </div>
  );
};
