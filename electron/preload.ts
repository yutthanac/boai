import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setAutoStart: (enable: boolean) => ipcRenderer.invoke('set-auto-start', enable),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  setMiniMode: (enable: boolean) => ipcRenderer.invoke('set-mini-mode', enable),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', { title, body }),
  sendMediaCommand: (command: string) => ipcRenderer.invoke('media-command', command),
  searchYouTube: (query: string) => ipcRenderer.invoke('search-youtube', query),
  fetchTts: (text: string) => ipcRenderer.invoke('fetch-tts', text),
  fetchGrokTts: (params: { text: string; apiKey: string; voice: string }) => ipcRenderer.invoke('fetch-grok-tts', params),
  executeSystemAction: (action: string, param?: string) => ipcRenderer.invoke('execute-system-action', { action, param }),
  onWakeWordTriggered: (callback: () => void) => {
    ipcRenderer.on('wake-word-detected', () => callback());
  },
  onMiniModeChanged: (callback: (isMini: boolean) => void) => {
    ipcRenderer.on('mini-mode-changed', (_event, isMini) => callback(isMini));
  },
  onToggleMiniModeTrigger: (callback: () => void) => {
    ipcRenderer.on('toggle-mini-mode-trigger', () => callback());
  },
  onToggleMuteFromTray: (callback: () => void) => {
    ipcRenderer.on('toggle-mute-from-tray', () => callback());
  },
  onMediaCommandReceived: (callback: (command: string) => void) => {
    ipcRenderer.on('media-command-received', (_event, command) => callback(command));
  },
  sendLineMessage: (params: { token: string; to?: string; message: string; broadcastIfNoTo?: boolean }) =>
    ipcRenderer.invoke('send-line-message', params),
  getLineWebhookInfo: () => ipcRenderer.invoke('get-line-webhook-info'),
  onLineUserConnected: (callback: (data: { userId: string; event: any; timestamp: string }) => void) => {
    ipcRenderer.on('line-user-connected', (_event, data) => callback(data));
  },
});

