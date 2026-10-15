import React, { useEffect } from 'react';
import { WindowFrame } from './components/WindowFrame';
import { Sidebar } from './components/Sidebar';
import { useAssistantStore } from './stores/useAssistantStore';

// Pages
import { Home } from './pages/Home';
import { Conversation } from './pages/Conversation';
import { VoiceDevices } from './pages/VoiceDevices';
import { TrainingStudio } from './pages/TrainingStudio';
import { Memory } from './pages/Memory';
import { Tools } from './pages/Tools';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, loadInitialData, startVoiceInteraction, state } = useAssistantStore();

  useEffect(() => {
    loadInitialData();

    // Global Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        if (state === 'idle') {
          startVoiceInteraction();
        }
      }

      if (e.altKey || e.ctrlKey) {
        if (e.key === '1') setActiveTab('home');
        if (e.key === '2') setActiveTab('conversation');
        if (e.key === '3') setActiveTab('voice');
        if (e.key === '4') setActiveTab('training');
        if (e.key === '5') setActiveTab('memory');
        if (e.key === '6') setActiveTab('tools');
        if (e.key === '7') setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'home':
        return <Home />;
      case 'conversation':
        return <Conversation />;
      case 'voice':
        return <VoiceDevices />;
      case 'training':
        return <TrainingStudio />;
      case 'memory':
        return <Memory />;
      case 'tools':
        return <Tools />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090E] text-slate-100 overflow-hidden select-none font-sans">
      {/* Window Title Bar */}
      <WindowFrame />

      {/* Main Workspace Body */}
      <div className="flex flex-1 h-[calc(100vh-2.5rem)] overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Page Container */}
        <main className="flex-1 h-full bg-[#090D16]/60 backdrop-blur-md overflow-hidden relative">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

export default App;
