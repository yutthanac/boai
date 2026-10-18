import { Minus, Square, X, Volume2, Mic, MicOff, Minimize2, Sun, Moon } from 'lucide-react';
import { useAssistantStore } from '../stores/useAssistantStore';

export const WindowFrame: React.FC = () => {
  const { state, statusText, isMuted, toggleMute, isAlwaysListening, toggleMiniMode, theme, toggleTheme } = useAssistantStore();

  const getStateBadge = () => {
    switch (state) {
      case 'listening':
        return {
          text: 'กำลังฟังคำสั่ง...',
          color: 'bg-cyan-950 text-cyan-300 border-cyan-800',
          dot: 'bg-cyan-400',
        };
      case 'thinking':
        return {
          text: 'กำลังประมวลผล...',
          color: 'bg-blue-950 text-blue-300 border-blue-800',
          dot: 'bg-blue-400',
        };
      case 'speaking':
        return {
          text: 'กำลังพูดตอบกลับ...',
          color: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          dot: 'bg-emerald-400',
        };
      default:
        return {
          text: isAlwaysListening ? 'พร้อมรับฟัง' : 'สแตนด์บาย',
          color: 'bg-slate-900 text-slate-300 border-slate-800',
          dot: isAlwaysListening ? 'bg-emerald-500' : 'bg-slate-500',
        };
    }
  };

  const badge = getStateBadge();

  return (
    <header className="h-10 w-full bg-[#0b0f19] border-b border-white/[0.08] flex items-center justify-between px-3 select-none window-drag-region z-50">
      {/* Left: App Title and Icon */}
      <div className="flex items-center gap-2.5 window-no-drag">
        <div className="w-6 h-6 rounded-md bg-white p-0.5 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
          <img src="/bobo.png" alt="Noar AI" className="w-full h-full object-contain rounded-sm" />
        </div>
        <span className="font-semibold text-xs tracking-wide text-slate-200">
          NOAR AI <span className="text-[11px] font-normal text-slate-400">(โนอา)</span>
        </span>

        {/* Status Pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-colors ${badge.color}`}>
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
          onClick={toggleTheme}
          title={theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง (Light Theme)' : 'เปลี่ยนเป็นธีมมืด (Dark Theme)'}
          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={toggleMiniMode}
          title="โหมดลูกแก้วลอย (Floating Orb) — Ctrl+Shift+B"
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>

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
          className="p-1.5 text-slate-400 hover:text-white rounded transition-colors window-close-btn"
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
