import { app, BrowserWindow, globalShortcut, screen } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc-handlers';
import { setupTray } from './tray';

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

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
    console.warn('[Bo AI] Failed to register global shortcuts:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

