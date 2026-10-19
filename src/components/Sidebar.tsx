import React from 'react';
import {
  Home,
  MessageSquare,
  Mic2,
  GraduationCap,
  Brain,
  Wrench,
  Settings,
  Radio,
} from 'lucide-react';
import { useAssistantStore } from '../stores/useAssistantStore';

export const Sidebar: React.FC = () => {
  const activeTab = useAssistantStore((s) => s.activeTab);
  const setActiveTab = useAssistantStore((s) => s.setActiveTab);
  const isAlwaysListening = useAssistantStore((s) => s.isAlwaysListening);
  const toggleAlwaysListening = useAssistantStore((s) => s.toggleAlwaysListening);

  const navItems = [
    { id: 'home', label: 'หน้าหลัก', icon: Home, badge: null },
    { id: 'conversation', label: 'แชทข้อความ', icon: MessageSquare, badge: null },
    { id: 'voice', label: 'เสียงและอุปกรณ์', icon: Mic2, badge: null },
    { id: 'training', label: 'ฝึกสอน AI', icon: GraduationCap, badge: null },
    { id: 'memory', label: 'คลังความจำ', icon: Brain, badge: null },
    { id: 'tools', label: 'เครื่องมือ', icon: Wrench, badge: null },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings, badge: null },
  ] as const;

  return (
    <aside className="w-64 h-[calc(100vh-2.5rem)] bg-[#181818] border-r border-[#2A2A2A] flex flex-col justify-between p-3 select-none">
      {/* Navigation Links */}
      <div className="space-y-4">
        <div className="px-2 pt-2">
          <p className="text-xs font-normal text-slate-400 tracking-wider">
            เมนูหลัก
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-normal transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#252525] text-white border border-[#38BDF8]/40 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#38BDF8]' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-normal border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Service Switch & System Tray Status */}
      <div className="space-y-3 pt-3 border-t border-[#2A2A2A]">
        {/* Always-on listening toggle */}
        <div className="p-2.5 rounded-lg bg-[#1E1E1E] border border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio
              className={`w-4 h-4 ${
                isAlwaysListening ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <div>
              <p className="text-xs font-normal text-slate-200">Always Listening</p>
              <p className="text-xs font-normal text-slate-400">
                {isAlwaysListening ? 'พร้อมรับฟังเสียงคำสั่ง' : 'ปิดการรอฟังชั่วคราว'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleAlwaysListening}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
              isAlwaysListening ? 'bg-[#38BDF8]' : 'bg-slate-700'
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
        <div className="px-2 text-xs font-normal text-slate-400 flex items-center justify-between">
          <span>รันในพื้นหลัง Windows</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Online
          </span>
        </div>
      </div>
    </aside>
  );
};
