import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setAutoStart: (enable: boolean) => ipcRenderer.invoke('set-auto-start', enable),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  onWakeWordTriggered: (callback: () => void) => {
    ipcRenderer.on('wake-word-detected', () => callback());
  },
});
