import React, { useState } from 'react';
import { useAssistantStore } from '../stores/useAssistantStore';
import { Maximize2, Mic, Volume2, VolumeX } from 'lucide-react';

export const FloatingOrbWidget: React.FC = () => {
  const { state, isMuted, statusText, toggleMiniMode, startVoiceInteraction, toggleMute } = useAssistantStore();
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic glow & color theme based on assistant state
  const getOrbTheme = () => {
    switch (state) {
      case 'listening':
        return {
          glow: 'rgba(6, 182, 212, 0.65)',
          border: 'border-cyan-400',
          gradient: 'from-cyan-500 via-sky-400 to-blue-600',
          animation: 'animate-pulse',
          label: 'กำลังฟัง...',
        };
      case 'thinking':
        return {
          glow: 'rgba(59, 130, 246, 0.7)',
          border: 'border-blue-400',
          gradient: 'from-blue-600 via-sky-500 to-indigo-700',
          animation: 'animate-spin',
          label: 'กำลังคิด...',
        };
      case 'speaking':
        return {
          glow: 'rgba(16, 185, 129, 0.7)',
          border: 'border-emerald-400',
          gradient: 'from-emerald-500 via-teal-400 to-cyan-500',
          animation: 'animate-pulse',
          label: 'กำลังพูด...',
        };
      case 'idle':
      default:
        return {
          glow: isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.45)',
          border: isMuted ? 'border-red-500/50' : 'border-sky-500/50',
          gradient: isMuted
            ? 'from-red-900/60 via-red-800/40 to-slate-900'
            : 'from-sky-600 via-teal-600 to-blue-700',
          animation: '',
          label: isMuted ? 'ปิดเสียง' : 'พร้อมรับคำสั่ง',
        };
    }
  };

  const theme = getOrbTheme();

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative select-none p-2 bg-transparent overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Draggable Aura & Orb Container */}
      <div
        className="relative flex items-center justify-center cursor-move window-drag-region"
        title="ลากเพื่อย้ายตำแหน่ง / ดับเบิลคลิกเพื่อเปิดหน้าต่างหลัก"
        onDoubleClick={toggleMiniMode}
      >
        {/* Ambient Outer Halo */}
        <div
          className={`absolute rounded-full filter blur-xl transition-all duration-700 pointer-events-none ${
            state !== 'idle' ? 'w-24 h-24' : 'w-20 h-20'
          }`}
          style={{
            backgroundColor: theme.glow,
            boxShadow: `0 0 35px ${theme.glow}`,
          }}
        />

        {/* Concentric Energy Wave Rings */}
        {state === 'listening' && (
          <div className="absolute inset-0 -m-3 rounded-full border border-cyan-400/40 animate-ping pointer-events-none" />
        )}
        {state === 'thinking' && (
          <div className="absolute inset-0 -m-2 rounded-full border border-dashed border-purple-400/60 animate-spin pointer-events-none" />
        )}

        {/* Main Central Orb Core */}
        <div
          className={`w-20 h-20 rounded-full bg-gradient-to-tr ${theme.gradient} p-[2px] shadow-2xl transition-all duration-300 relative flex items-center justify-center ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        >
          {/* Inner Glass Sphere */}
          <div className="w-full h-full rounded-full bg-[#07090E]/85 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden border border-white/20 shadow-inner">
            {/* Shimmer Light Reflection */}
            <div className="absolute top-1 left-2 w-8 h-4 bg-white/25 rounded-full filter blur-[1px] rotate-[-25deg] pointer-events-none" />

            {/* Core Visual Pulse */}
            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-tr ${theme.gradient} filter blur-[2px] opacity-90 transition-transform ${
                state === 'listening' ? 'scale-125' : state === 'speaking' ? 'scale-110' : 'scale-95'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Floating Mini Overlay Controls (No-Drag to allow clicks) */}
      <div
        className={`absolute bottom-1 flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#0F1523]/90 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-200 window-no-drag ${
          isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-90 pointer-events-none'
        }`}
      >
        <button
          onClick={startVoiceInteraction}
          title="เริ่มพูดสั่งการ"
          className="p-1 rounded-full text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleMute}
          title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          className={`p-1 rounded-full transition-colors ${
            isMuted
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={toggleMiniMode}
          title="ขยายเป็นหน้าต่างหลัก (Ctrl+Shift+B)"
          className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mini State Caption */}
      <div className="absolute top-1 px-1.5 py-0.5 rounded-full bg-black/50 text-[9px] font-medium text-slate-300 pointer-events-none truncate max-w-[110px]">
        {theme.label}
      </div>
    </div>
  );
};
