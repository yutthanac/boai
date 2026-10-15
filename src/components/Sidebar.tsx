import React from 'react';
import {
  Sparkles,
  MessageSquare,
  Mic2,
  GraduationCap,
  Brain,
  Wrench,
  Settings,
  Radio,
  Power
} from 'lucide-react';
import { useAssistantStore } from '../stores/useAssistantStore';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, isAlwaysListening, toggleAlwaysListening } = useAssistantStore();

  const navItems = [
    { id: 'home', label: 'หน้าหลัก (Home)', icon: Sparkles, badge: null },
    { id: 'conversation', label: 'การสนทนา (Chat)', icon: MessageSquare, badge: null },
    { id: 'voice', label: 'เสียง & อุปกรณ์ (Voice)', icon: Mic2, badge: null },
    { id: 'training', label: 'Training Studio', icon: GraduationCap, badge: 'ใหม่' },
    { id: 'memory', label: 'ความจำ (Memory)', icon: Brain, badge: null },
    { id: 'tools', label: 'เครื่องมือ (Tools)', icon: Wrench, badge: null },
    { id: 'settings', label: 'ตั้งค่า (Settings)', icon: Settings, badge: null },
  ] as const;

  return (
    <aside className="w-64 h-[calc(100vh-2.5rem)] bg-[#0A0D15]/95 border-r border-white/[0.06] flex flex-col justify-between p-3 select-none">
      {/* Navigation Links */}
      <div className="space-y-6">
        <div className="px-2 pt-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            เมนูหลัก / NAVIGATION
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/10 text-white border border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-semibold border border-indigo-500/40">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Service Switch & System Tray Status */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06]">
        {/* Always-on listening toggle */}
        <div className="p-2.5 rounded-lg bg-surface border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio
              className={`w-4 h-4 ${
                isAlwaysListening ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <div>
              <p className="text-xs font-medium text-slate-200">Always Listening</p>
              <p className="text-[10px] text-slate-400">
                {isAlwaysListening ? 'รอฟังเสียงคำเรียกตลอด' : 'ปิดการรอฟังชั่วคราว'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleAlwaysListening}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
              isAlwaysListening ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                isAlwaysListening ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* System info */}
        <div className="px-2 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Tray: รันในพื้นหลัง Windows</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Online
          </span>
        </div>
      </div>
    </aside>
  );
};
