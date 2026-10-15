import { ipcMain, BrowserWindow, app, shell, screen, Notification } from 'electron';
import os from 'os';

let normalBounds = { width: 1180, height: 760, x: 100, y: 100 };

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

  // Toggle Mini Mode (Floating Orb)
  ipcMain.handle('set-mini-mode', async (_event, enable: boolean) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    if (enable) {
      const bounds = mainWindow.getBounds();
      if (bounds.width > 250) {
        normalBounds = bounds;
      }
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      const size = 135;
      mainWindow.setMinimumSize(120, 120);
      mainWindow.setBounds({
        x: width - size - 24,
        y: height - size - 24,
        width: size,
        height: size,
      });
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.webContents.send('mini-mode-changed', true);
    } else {
      mainWindow.setMinimumSize(980, 640);
      mainWindow.setBounds(normalBounds);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.webContents.send('mini-mode-changed', false);
    }
    return true;
  });

  // Native Windows Toast Notification
  ipcMain.handle('show-notification', async (_event, { title, body }: { title: string; body: string }) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
        return true;
      }
    } catch (e) {
      console.warn('Failed to show notification:', e);
    }
    return false;
  });

  // Media Playback IPC Control
  ipcMain.handle('media-command', async (_event, command: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-command-received', command);
    }
    return true;
  });

  // Search real YouTube Video ID for bulletproof iframe embed
  ipcMain.handle('search-youtube', async (_event, query: string) => {
    try {
      const https = await import('https');
      return new Promise<string | null>((resolve) => {
        const req = https.get(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
            },
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              const matches = [...body.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
              if (matches.length > 0) {
                resolve(matches[0][1]);
              } else {
                resolve(null);
              }
            });
          }
        );
        req.on('error', () => resolve(null));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(null);
        });
      });
    } catch (e) {
      console.warn('search-youtube IPC error:', e);
      return null;
    }
  });

  ipcMain.handle('open-external', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (e) {
      console.warn('Failed to open external url:', e);
      return false;
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

