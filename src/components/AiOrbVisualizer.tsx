import React, { useRef } from 'react';
import { useAssistantStore } from '../stores/useAssistantStore';
import { Mic, Volume2, Loader2 } from 'lucide-react';
import LiveOrb from '@/components/ui/live-orb';

export const AiOrbVisualizer: React.FC = () => {
  const { state, startVoiceInteraction, isMuted } = useAssistantStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const getStatusInfo = () => {
    switch (state) {
      case 'listening':
        return {
          ring: 'border-cyan-400 ring-4 ring-cyan-500/30',
          textColor: 'text-cyan-400',
          status: 'โบ้กำลังตั้งใจฟังคำสั่ง...',
          badge: 'LISTENING',
          pulseColor: 'bg-cyan-500/20 border-cyan-400/40',
        };
      case 'thinking':
        return {
          ring: 'border-blue-400 ring-4 ring-blue-500/30',
          textColor: 'text-blue-400',
          status: 'โบ้กำลังคิดหาคำตอบให้เพื่อน...',
          badge: 'THINKING',
          pulseColor: 'bg-blue-500/20 border-blue-400/40',
        };
      case 'speaking':
        return {
          ring: 'border-emerald-400 ring-4 ring-emerald-500/35',
          textColor: 'text-emerald-400',
          status: 'โบ้กำลังพูดตอบกลับคุณ...',
          badge: 'SPEAKING',
          pulseColor: 'bg-emerald-500/20 border-emerald-400/50',
        };
      default:
        return {
          ring: 'border-indigo-500/30 hover:border-indigo-400/60',
          textColor: 'text-slate-300',
          status: 'คลิกที่โบ้ หรือเรียก "โบ้" เพื่อเริ่มคุย',
          badge: 'ONLINE',
          pulseColor: 'bg-transparent border-transparent',
        };
    }
  };

  const info = getStatusInfo();
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center py-4 select-none relative w-full max-w-md mx-auto">
      {/* Main Avatar Character Stage */}
      <div className="relative flex items-center justify-center">
        {/* Voice Ripple Rings during Speaking & Listening */}
        {(isSpeaking || isListening) && (
          <>
            <div
              className={`absolute -inset-4 rounded-full border pointer-events-none animate-bo-voice-ring-1 ${info.pulseColor}`}
            />
            <div
              className={`absolute -inset-8 rounded-full border pointer-events-none animate-bo-voice-ring-2 ${info.pulseColor}`}
            />
          </>
        )}

        {/* Interactive Companion Button */}
        <button
          type="button"
          onClick={() => {
            if (!isMuted && state === 'idle') {
              startVoiceInteraction();
            }
          }}
          disabled={isThinking}
          title={state === 'idle' ? 'คลิกที่โบ้เพื่อเริ่มพูดคุย' : info.status}
          className={`relative w-48 h-48 rounded-full p-2 bg-[#0a0f1d] border-2 transition-all duration-300 cursor-pointer focus:outline-none ${info.ring} shadow-[0_8px_32px_rgba(0,0,0,0.5)] group`}
        >
          {/* Inner Stage Container */}
          <div
            className={`w-full h-full rounded-full overflow-hidden relative flex items-center justify-center border border-white/10 ${
              isSpeaking ? 'animate-bo-talk-bob' : ''
            }`}
            style={{
              background: '#090d16',
            }}
          >
            {/* The 3D WebGL LiveOrb Face (Exact model requested by user) */}
            <div className="relative w-full h-full flex items-center justify-center">
              <LiveOrb
                size={176}
                variant="webgl"
                interactive={true}
                blink={true}
                colors={['#7C6AF7', '#7DD3C7', '#E8B4D4']}
              />

              {/* ======================================================== */}
              {/* TALKING MOUTH (วาดปากบน LiveOrb ให้ขยับตามเสียงพูด) */}
              {/* ======================================================== */}
              <div className="absolute bottom-[44px] flex flex-col items-center justify-center z-30 pointer-events-none">
                {/* 1. STATE: SPEAKING -> Realistic Dynamic Talking Mouth with Teeth & Tongue */}
                {isSpeaking && (
                  <div className="relative flex flex-col items-center justify-center">
                    {/* Glowing speech mouth cavity */}
                    <div
                      className="w-8 bg-[#2d0b17] border-2 border-emerald-400/90 rounded-b-2xl rounded-t-sm shadow-[0_0_12px_rgba(52,211,153,0.7)] overflow-hidden animate-bo-mouth-talk relative flex flex-col items-center justify-between"
                      style={{
                        boxShadow: '0 0 10px rgba(52,211,153,0.5), inset 0 2px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      {/* Top teeth bar */}
                      <div className="w-5 h-1.5 bg-white/95 rounded-b-sm shadow-xs" />

                      {/* Pink bouncy tongue */}
                      <div className="w-6 h-3.5 bg-gradient-to-t from-rose-500 to-pink-400 rounded-t-full animate-bo-tongue shadow-inner" />
                    </div>

                    {/* Speech resonance wave glow */}
                    <div className="w-10 h-1 rounded-full bg-emerald-400/40 blur-[1px] mt-1 animate-pulse" />
                  </div>
                )}

                {/* 2. STATE: LISTENING -> Attentive open 'o' mouth with cyan glow */}
                {isListening && (
                  <div className="w-4 h-3.5 rounded-full bg-[#1b1e2e] border-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] flex items-center justify-center">
                    <div className="w-2 h-1.5 rounded-full bg-cyan-300/80 animate-pulse" />
                  </div>
                )}

                {/* 3. STATE: THINKING -> Small thinking expression */}
                {isThinking && (
                  <div className="w-3.5 h-1 rounded-full bg-blue-400/80 shadow-[0_0_6px_rgba(96,165,250,0.7)] animate-pulse" />
                )}

                {/* 4. STATE: IDLE -> Sweet friendly smile curve */}
                {state === 'idle' && (
                  <svg className="w-6 h-2.5 text-slate-800/90 drop-shadow-sm" viewBox="0 0 24 10" fill="none">
                    <path
                      d="M 4 2 Q 12 9 20 2"
                      stroke="#1e2230"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* State Badges in Corner */}
            {isThinking && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center z-30">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            )}

            {isListening && (
              <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-cyan-500 text-slate-950 shadow-md z-30 animate-bounce">
                <Mic className="w-4 h-4" />
              </div>
            )}

            {isSpeaking && (
              <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-emerald-500 text-slate-950 shadow-md z-30">
                <Volume2 className="w-4 h-4" />
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Clean Status & Helper Info */}
      <div className="mt-4 text-center space-y-1 z-10">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-md font-mono font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/80 shadow-xs">
            {info.badge}
          </span>
          <p className={`text-sm font-medium ${info.textColor}`}>
            {info.status}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          คำเรียก: "โบ้" • สายตามองตามเมาส์ และขยับปากตอบตามเสียง
        </p>
      </div>
    </div>
  );
};
