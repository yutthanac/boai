import { app, BrowserWindow, globalShortcut, screen } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc-handlers';
import { setupTray } from './tray';
import { lineWebhookServer } from './line-webhook';
import { startLocalServer, stopLocalServer } from './local-server';

// Enable background audio and video autoplay without user gesture requirement
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow: BrowserWindow | null = null;

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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, serve via local http://127.0.0.1 server to enable Chromium SpeechRecognition and Secure Context
    const distPath = path.join(__dirname, '../dist');
    startLocalServer(distPath)
      .then((port) => {
        mainWindow?.loadURL(`http://127.0.0.1:${port}`);
      })
      .catch((err) => {
        console.warn('[Noar] Failed to start local server, fallback to loadFile:', err);
        mainWindow?.loadFile(path.join(distPath, 'index.html'));
      });
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

  // Register Global Hotkeys (Alt+Space to summon, Ctrl+Shift+B for Mini Orb)
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
  stopLocalServer();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

