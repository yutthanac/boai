/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_CLAUDE_API_KEY?: string;
  readonly VITE_CLAUDE_MODEL?: string;
  readonly VITE_OPEN_METEO_BASE_URL?: string;
  readonly VITE_OPEN_METEO_GEO_URL?: string;
  readonly VITE_DEFAULT_CITY?: string;
  readonly VITE_DEFAULT_LATITUDE?: string;
  readonly VITE_DEFAULT_LONGITUDE?: string;
  readonly VITE_WEATHER_TIMEZONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI?: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    setAutoStart: (enable: boolean) => Promise<boolean>;
    getSystemInfo: () => Promise<any>;
    openExternal: (url: string) => Promise<boolean>;
    setMiniMode: (enable: boolean) => Promise<boolean>;
    showNotification: (title: string, body: string) => Promise<boolean>;
    sendMediaCommand: (command: string) => Promise<boolean>;
    searchYouTube: (query: string) => Promise<string | null>;
    fetchTts?: (text: string) => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
    fetchGrokTts?: (params: { text: string; apiKey: string; voice: string }) => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
    executeSystemAction?: (action: string, param?: string) => Promise<{ success: boolean; message: string }>;
    onWakeWordTriggered: (callback: () => void) => void;
    onMiniModeChanged: (callback: (isMini: boolean) => void) => void;
    onToggleMiniModeTrigger: (callback: () => void) => void;
    onToggleMuteFromTray: (callback: () => void) => void;
    onMediaCommandReceived: (callback: (command: string) => void) => void;
  };
}

