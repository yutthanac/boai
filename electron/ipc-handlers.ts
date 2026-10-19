import { ipcMain, BrowserWindow, app, shell, screen, Notification } from 'electron';
import path from 'path';
import os from 'os';
import https from 'https';
import { exec } from 'child_process';
import { URL } from 'url';

let normalBounds = { width: 1180, height: 760, x: 100, y: 100 };

async function sendToWhisperApi(params: {
  endpoint: string;
  apiKey: string;
  model: string;
  buffer: Buffer;
  mimeType: string;
  language?: string;
}): Promise<string | null> {
  const { endpoint, apiKey, model, buffer, mimeType, language = 'th' } = params;
  try {
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'ogg';
    const fd = new FormData();
    fd.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), `audio.${ext}`);
    fd.append('model', model);
    if (language) {
      fd.append('language', language);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const startTime = Date.now();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: fd,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json: any = await res.json();
      const elapsed = Date.now() - startTime;
      console.log(`[Whisper STT] ${model} completed in ${elapsed}ms:`, json?.text?.slice(0, 80));
      return json?.text ? json.text.trim() : null;
    } else {
      const errText = await res.text();
      console.warn(`[Whisper STT] HTTP ${res.status}:`, errText.slice(0, 150));
      return null;
    }
  } catch (err: any) {
    console.warn('[Whisper STT] Request failed:', err?.message || err);
    return null;
  }
}

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
      const size = 150;
      mainWindow.setMinimumSize(100, 100);
      mainWindow.setResizable(false);
      mainWindow.setHasShadow(false);
      mainWindow.setBounds({
        x: width - size - 24,
        y: height - size - 40,
        width: size,
        height: size,
      });
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.webContents.send('mini-mode-changed', true);
    } else {
      mainWindow.setResizable(true);
      mainWindow.setMinimumSize(980, 640);
      mainWindow.setBounds(normalBounds);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setHasShadow(true);
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
      if (process.platform === 'win32') {
        const appPath = app.isPackaged
          ? `"${app.getPath('exe')}"`
          : `"${process.execPath}" "${path.resolve(__dirname, '..')}"`;

        if (enable) {
          const escapedAppPath = appPath.replace(/"/g, '\\"');
          exec(
            `powershell -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'NoarAI' -Value '${escapedAppPath}'"`
          );
          app.setLoginItemSettings({
            openAtLogin: true,
            path: process.execPath,
            args: app.isPackaged ? [] : [path.resolve(__dirname, '..')],
          });
        } else {
          exec(
            `powershell -Command "Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'NoarAI' -ErrorAction SilentlyContinue"`
          );
          app.setLoginItemSettings({
            openAtLogin: false,
          });
        }
      } else {
        app.setLoginItemSettings({
          openAtLogin: enable,
        });
      }
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

  // Native Speech-to-Text Transcription via Groq Whisper (turbo) & OpenAI Whisper
  ipcMain.handle(
    'transcribe-audio',
    async (
      _event,
      params: { audioBase64: string; mimeType?: string; language?: string; apiKey?: string }
    ) => {
      try {
        const { audioBase64, mimeType = 'audio/webm', language = 'th', apiKey } = params || {};
        if (!audioBase64) return { success: false, error: 'Empty audio buffer' };

        const buffer = Buffer.from(audioBase64, 'base64');
        if (buffer.length < 300) {
          return { success: false, error: 'Audio too short' };
        }

        const groqKey =
          (apiKey && apiKey.startsWith('gsk_') ? apiKey : null) ||
          process.env.VITE_GROQ_API_KEY ||
          process.env.GROQ_API_KEY ||
          '';
        const openaiKey =
          (apiKey && apiKey.startsWith('sk-') ? apiKey : null) ||
          process.env.VITE_OPENAI_API_KEY ||
          process.env.OPENAI_API_KEY ||
          '';

        // 1. First priority: Groq Whisper (ultra fast ~250ms)
        if (groqKey) {
          const text = await sendToWhisperApi({
            endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
            apiKey: groqKey,
            model: 'whisper-large-v3-turbo',
            buffer,
            mimeType,
            language,
          });
          if (text && text.trim()) {
            return { success: true, text: text.trim() };
          }
        }

        // 2. Fallback: OpenAI Whisper
        if (openaiKey) {
          const text = await sendToWhisperApi({
            endpoint: 'https://api.openai.com/v1/audio/transcriptions',
            apiKey: openaiKey,
            model: 'whisper-1',
            buffer,
            mimeType,
            language,
          });
          if (text && text.trim()) {
            return { success: true, text: text.trim() };
          }
        }

        return { success: false, error: 'Could not transcribe speech' };
      } catch (e: any) {
        console.warn('transcribe-audio error:', e);
        return { success: false, error: e?.message || 'Transcription failed' };
      }
    }
  );

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

  // LINE Official Account Message Dispatcher (Push or Broadcast via Node https)
  ipcMain.handle('send-line-message', async (_event, params: { token: string; to?: string; message: string; broadcastIfNoTo?: boolean }) => {
    try {
      const { token, to, message, broadcastIfNoTo } = params || {};
      if (!token) return { success: false, error: 'Missing LINE Channel Access Token' };
      if (!message) return { success: false, error: 'Empty message text' };

      const useBroadcast = !to && broadcastIfNoTo;
      const endpoint = useBroadcast
        ? 'https://api.line.me/v2/bot/message/broadcast'
        : 'https://api.line.me/v2/bot/message/push';

      const payload = useBroadcast
        ? { messages: [{ type: 'text', text: message }] }
        : { to: to, messages: [{ type: 'text', text: message }] };

      const bodyStr = JSON.stringify(payload);

      return new Promise<{ success: boolean; statusCode?: number; error?: string; data?: any }>((resolve) => {
        const req = https.request(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(bodyStr),
          },
          timeout: 10000,
        }, (res) => {
          let resData = '';
          res.on('data', chunk => resData += chunk);
          res.on('end', () => {
            const isOk = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
            if (isOk) {
              resolve({ success: true, statusCode: res.statusCode });
            } else {
              resolve({
                success: false,
                statusCode: res.statusCode,
                error: `LINE API HTTP ${res.statusCode}: ${resData.slice(0, 250)}`,
              });
            }
          });
        });

        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'LINE Request Timeout' });
        });

        req.write(bodyStr);
        req.end();
      });
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  });

  // Get LINE Webhook Server Status
  ipcMain.handle('get-line-webhook-info', async () => {
    try {
      const { lineWebhookServer } = await import('./line-webhook');
      return lineWebhookServer.getStatus();
    } catch (e: any) {
      return { running: false, error: e?.message };
    }
  });
}

