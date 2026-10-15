import React from 'react';
import { Minus, Square, X, Sparkles, Volume2, Mic, MicOff } from 'lucide-react';
import { useAssistantStore } from '../stores/useAssistantStore';

export const WindowFrame: React.FC = () => {
  const { state, statusText, isMuted, toggleMute, isAlwaysListening } = useAssistantStore();

  const getStateBadge = () => {
    switch (state) {
      case 'listening':
        return {
          text: 'กำลังฟังคำสั่ง...',
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse',
          dot: 'bg-cyan-400 animate-ping',
        };
      case 'thinking':
        return {
          text: 'กำลังประมวลผล...',
          color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse',
          dot: 'bg-indigo-400 animate-spin',
        };
      case 'speaking':
        return {
          text: 'กำลังพูดตอบกลับ...',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400 animate-bounce',
        };
      default:
        return {
          text: isAlwaysListening ? 'พร้อมรับฟัง (น้องโบ)' : 'สแตนด์บาย',
          color: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
          dot: isAlwaysListening ? 'bg-indigo-400' : 'bg-slate-500',
        };
    }
  };

  const badge = getStateBadge();

  return (
    <header className="h-10 w-full bg-[#080B12]/90 border-b border-white/[0.06] flex items-center justify-between px-3 select-none window-drag-region z-50">
      {/* Left: App Title and Icon */}
      <div className="flex items-center gap-2.5 window-no-drag">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-sm">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <span className="font-semibold text-xs tracking-wider text-slate-200">
          BO AI <span className="text-[11px] font-normal text-slate-400">(น้องโบ v1.0)</span>
        </span>

        {/* Status Pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all duration-300 ${badge.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          <span>{badge.text}</span>
        </div>
      </div>

      {/* Center status message snippet */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-sm">
        <span className="text-slate-500">•</span>
        <span className="truncate">{statusText}</span>
      </div>

      {/* Right: Quick Controls & Window Buttons */}
      <div className="flex items-center gap-1 window-no-drag">
        <button
          onClick={toggleMute}
          title={isMuted ? 'เปิดไมค์/เสียง' : 'ปิดไมค์/เสียง (Mute)'}
          className={`p-1.5 rounded-md transition-colors text-xs ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <div className="h-3.5 w-px bg-white/10 mx-1" />

        <button
          title="ย่อหน้าต่าง"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          onClick={() => {
            if ((window as any).electronAPI) {
              (window as any).electronAPI.minimize();
            }
          }}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          title="ขยายเต็มจอ"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          onClick={() => {
            if ((window as any).electronAPI) {
              (window as any).electronAPI.maximize();
            }
          }}
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          title="ปิด / ย่อลง System Tray"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-rose-600 rounded transition-colors"
          onClick={() => {
            if ((window as any).electronAPI) {
              (window as any).electronAPI.close();
            }
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
