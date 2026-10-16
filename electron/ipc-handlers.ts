import { ipcMain, BrowserWindow, app, shell, screen, Notification } from 'electron';
import os from 'os';
import https from 'https';
import { exec } from 'child_process';

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

  // Native High-Quality Natural Thai Female TTS Proxy
  ipcMain.handle('fetch-tts', async (_event, text: string) => {
    try {
      const encoded = encodeURIComponent((text || '').slice(0, 200));
      const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=th&client=tw-ob`;

      return new Promise<{ success: boolean; dataUrl?: string; error?: string }>((resolve) => {
        const req = https.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/'
          }
        }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            const base64 = buf.toString('base64');
            resolve({
              success: true,
              dataUrl: `data:audio/mpeg;base64,${base64}`
            });
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  });

  // Native xAI Grok TTS Proxy (Bypasses browser CORS & supports official xAI TTS endpoint)
  ipcMain.handle('fetch-grok-tts', async (_event, params: { text: string; apiKey: string; voice?: string }) => {
    try {
      const { text, apiKey, voice } = params || {};
      if (!apiKey) return { success: false, error: 'Missing xAI API Key' };

      const body = JSON.stringify({
        text: (text || '').trim(),
        voice: voice || 'leo',
        language: 'auto',
      });

      return new Promise<{ success: boolean; dataUrl?: string; error?: string }>((resolve) => {
        const req = https.request('https://api.x.ai/v1/tts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 10000,
        }, (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            let errBuf = '';
            res.on('data', c => errBuf += c);
            res.on('end', () => {
              resolve({ success: false, error: `xAI Grok TTS HTTP ${res.statusCode}: ${errBuf.slice(0, 150)}` });
            });
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            const base64 = buf.toString('base64');
            const mime = res.headers['content-type'] || 'audio/mpeg';
            resolve({
              success: true,
              dataUrl: `data:${mime};base64,${base64}`
            });
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'xAI Grok TTS Request Timeout' });
        });

        req.write(body);
        req.end();
      });
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  });

  // Windows System Remote & Native Utility Actions
  ipcMain.handle('execute-system-action', async (_event, { action, param }: { action: string; param?: string }) => {
    try {
      if (action === 'lock') {
        exec('rundll32.exe user32.dll,LockWorkStation');
        return { success: true, message: 'ล็อคหน้าจอเรียบร้อยแล้วค่ะ' };
      }
      if (action === 'calc') {
        exec('calc.exe');
        return { success: true, message: 'เปิดเครื่องคิดเลขเรียบร้อยแล้วค่ะ' };
      }
      if (action === 'notepad') {
        exec('notepad.exe');
        return { success: true, message: 'เปิด Notepad เรียบร้อยแล้วค่ะ' };
      }
      if (action === 'explorer') {
        exec('explorer.exe');
        return { success: true, message: 'เปิด File Explorer เรียบร้อยแล้วค่ะ' };
      }
      if (action === 'taskmgr') {
        exec('taskmgr.exe');
        return { success: true, message: 'เปิด Task Manager เรียบร้อยแล้วค่ะ' };
      }
      if (action === 'open-url' && param) {
        await shell.openExternal(param);
        return { success: true, message: `เปิดลิงก์ ${param} บนเบราว์เซอร์แล้วค่ะ` };
      }
      return { success: false, message: `ไม่พบคำสั่ง ${action}` };
    } catch (e: any) {
      console.warn('execute-system-action error:', e);
      return { success: false, message: e?.message || 'การสั่งการล้มเหลว' };
    }
  });
}

