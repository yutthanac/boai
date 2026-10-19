import React, { useEffect, Suspense, lazy } from 'react';
import { WindowFrame } from './components/WindowFrame';
import { Sidebar } from './components/Sidebar';
import { FloatingOrbWidget } from './components/FloatingOrbWidget';
import { MiniMusicBar } from './components/MiniMusicBar';
import { useAssistantStore } from './stores/useAssistantStore';

// Main landing page loaded immediately for instant startup
import { Home } from './pages/Home';

// Code-split pages loaded on-demand for maximum performance & small bundle size
const Conversation = lazy(() => import('./pages/Conversation').then((m) => ({ default: m.Conversation })));
const VoiceDevices = lazy(() => import('./pages/VoiceDevices').then((m) => ({ default: m.VoiceDevices })));
const TrainingStudio = lazy(() => import('./pages/TrainingStudio').then((m) => ({ default: m.TrainingStudio })));
const Memory = lazy(() => import('./pages/Memory').then((m) => ({ default: m.Memory })));
const Tools = lazy(() => import('./pages/Tools').then((m) => ({ default: m.Tools })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

// Sleek lightweight loading fallback
const PageLoadingFallback: React.FC = () => (
  <div className="h-full w-full flex items-center justify-center bg-transparent select-none">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#38BDF8]/20 border-t-[#38BDF8] animate-spin" />
      <span className="text-xs text-slate-400 font-normal">กำลังโหลดข้อมูล...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  // Atomic store selectors to prevent wasteful full-app re-renders
  const activeTab = useAssistantStore((s) => s.activeTab);
  const setActiveTab = useAssistantStore((s) => s.setActiveTab);
  const loadInitialData = useAssistantStore((s) => s.loadInitialData);
  const startVoiceInteraction = useAssistantStore((s) => s.startVoiceInteraction);
  const state = useAssistantStore((s) => s.state);
  const isMiniMode = useAssistantStore((s) => s.isMiniMode);
  const toggleMiniMode = useAssistantStore((s) => s.toggleMiniMode);
  const theme = useAssistantStore((s) => s.theme);

  // Load initial data ONCE on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Global Keyboard Shortcuts (Registered once, uses getState() to avoid re-renders)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        useAssistantStore.getState().toggleMiniMode();
        return;
      }

      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        if (useAssistantStore.getState().state === 'idle') {
          useAssistantStore.getState().startVoiceInteraction();
        }
      }

      if (e.altKey || e.ctrlKey) {
        if (e.key === '1') useAssistantStore.getState().setActiveTab('home');
        if (e.key === '2') useAssistantStore.getState().setActiveTab('conversation');
        if (e.key === '3') useAssistantStore.getState().setActiveTab('voice');
        if (e.key === '4') useAssistantStore.getState().setActiveTab('training');
        if (e.key === '5') useAssistantStore.getState().setActiveTab('memory');
        if (e.key === '6') useAssistantStore.getState().setActiveTab('tools');
        if (e.key === '7') useAssistantStore.getState().setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // When in Mini Mode: Render standalone floating orb
  if (isMiniMode) {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden select-none font-sans flex items-center justify-center">
        <FloatingOrbWidget />
      </div>
    );
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'home':
        return <Home />;
      case 'conversation':
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Conversation />
          </Suspense>
        );
      case 'voice':
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <VoiceDevices />
          </Suspense>
        );
      case 'training':
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <TrainingStudio />
          </Suspense>
        );
      case 'memory':
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Memory />
          </Suspense>
        );
      case 'tools':
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Tools />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Settings />
          </Suspense>
        );
      default:
        return <Home />;
    }
  };

  return (
    <div
      className={`flex flex-col h-screen w-screen rounded-2xl border border-white/10 shadow-2xl bg-[#121212] text-slate-100 overflow-hidden select-none font-sans transition-all duration-200 ${
        theme === 'light' ? 'theme-light light bg-[#f1f5f9] text-slate-900 border-black/10' : 'theme-dark dark'
      }`}
    >
      {/* Window Title Bar */}
      <WindowFrame />

      {/* Main Workspace Body */}
      <div className="flex flex-1 h-[calc(100vh-2.5rem)] overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Page Container with MiniMusicBar docked at bottom */}
        <main className="flex-1 h-full bg-[#121212] overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            {renderActivePage()}
          </div>

          {/* Mini Music Bar */}
          <MiniMusicBar />
        </main>
      </div>
    </div>
  );
};

export default App;

