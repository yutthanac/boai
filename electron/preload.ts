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
});

