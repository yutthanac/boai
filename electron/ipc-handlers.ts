import { ipcMain, BrowserWindow, app } from 'electron';
import os from 'os';

export function setupIpcHandlers(mainWindow: BrowserWindow) {
  ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Hide to system tray instead of destroying
      mainWindow.hide();
    }
  });

  ipcMain.handle('set-auto-start', async (_event, enable: boolean) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe'),
      });
      return true;
    } catch (e) {
      console.error('Failed to set login item settings:', e);
      return false;
    }
  });

  ipcMain.handle('get-system-info', async () => {
    return {
      platform: process.platform,
      arch: os.arch(),
      release: os.release(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      cpus: os.cpus().length,
    };
  });
}
