import { app, BrowserWindow, globalShortcut, screen, powerSaveBlocker } from 'electron';
import path from 'path';
import fs from 'fs';
import { setupIpcHandlers } from './ipc-handlers';
import { setupTray } from './tray';
import { lineWebhookServer } from './line-webhook';
import { startLocalServer, stopLocalServer } from './local-server';

// Load .env variables into process.env so IPC handlers have API keys
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        value = value.trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (_) {}

// Enable background audio, video autoplay, and prevent Chromium from throttling background timers/speech
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

let mainWindow: BrowserWindow | null = null;
let powerBlockerId: number | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 120,
    minHeight: 120,
    frame: false, // Frameless custom window bar
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    hasShadow: true,
    icon: path.join(__dirname, '../public/bobo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Keep voice listening and timer loops running at full speed in background!
    },
  });

  setupIpcHandlers(mainWindow);
  setupTray(mainWindow);

  // Auto-grant media (microphone) permission so SpeechRecognition and Web Audio work seamlessly
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
      return;
    }
    callback(true);
  });

  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return true;
  });

  // Initialize and start LINE Webhook Server
  lineWebhookServer.setMainWindow(mainWindow);
  lineWebhookServer.start().catch((err) => {
    console.warn('[LineWebhook] Startup warning:', err);
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const distPath = path.join(__dirname, '../dist');

  let localServerPort: number | null = null;
  const loadProductionBuild = async () => {
    try {
      if (!localServerPort) {
        localServerPort = await startLocalServer(distPath);
      }
      await mainWindow?.loadURL(`http://127.0.0.1:${localServerPort}`);
    } catch (err) {
      console.warn('[Noar] Failed to start local server, fallback to loadFile:', err);
      mainWindow?.loadFile(path.join(distPath, 'index.html'));
    }
  };

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      console.log('[Noar] Dev server not responding, fallback to local build.');
      loadProductionBuild();
    });

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, _errorDescription, validatedURL) => {
      if (validatedURL.includes('localhost:5173')) {
        console.log('[Noar] Vite server unreachable, loading local production build.');
        loadProductionBuild();
      }
    });
  } else {
    loadProductionBuild();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Configure Windows Auto-Start on System Boot
  if (process.platform === 'win32') {
    try {
      const appPath = app.isPackaged
        ? `"${app.getPath('exe')}"`
        : `"${process.execPath}" "${path.resolve(__dirname, '..')}"`;

      const { exec } = require('child_process');
      const escapedAppPath = appPath.replace(/"/g, '\\"');
      exec(
        `powershell -Command "if (-not (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'NoarAI' -ErrorAction SilentlyContinue)) { Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'NoarAI' -Value '${escapedAppPath}' }"`
      );

      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: app.isPackaged ? [] : [path.resolve(__dirname, '..')],
      });
      console.log('[Noar AI] Windows startup registration verified.');
    } catch (e) {
      console.warn('[Noar AI] Auto-start registration warning:', e);
    }
  }

  // Prevent Windows from suspending the assistant process in the background
  try {
    powerBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  } catch (_) {}

  // Register Global Hotkeys:
  // - Alt+Space: Summon / Focus / Hide
  // - Ctrl+Shift+B: Toggle Mini Orb
  // - Ctrl+Space: Instant Voice Command
  try {
    globalShortcut.register('Alt+Space', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    globalShortcut.register('CommandOrControl+Shift+B', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send('toggle-mini-mode-trigger');
    });

    globalShortcut.register('CommandOrControl+Space', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send('start-voice-command-trigger');
    });
  } catch (err) {
    console.warn('[Noar AI] Failed to register global shortcuts:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  if (powerBlockerId !== null) {
    try {
      powerSaveBlocker.stop(powerBlockerId);
    } catch (_) {}
  }
  stopLocalServer();
  globalShortcut.unregisterAll();
});

// Keep running in system tray / background when window is closed
app.on('window-all-closed', () => {
  // Do not quit: keep running in system tray / background
});

