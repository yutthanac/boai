import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): Tray {
  // Create simple solid icon image if file doesn't exist
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Bo AI (น้องโบ) — Personal AI Desktop Assistant');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'เปิดหน้าต่างหลัก (Show Bo AI) — Alt+Space',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'สลับโหมดลูกแก้วลอย (Floating Orb) — Ctrl+Shift+B',
      click: () => {
        mainWindow.webContents.send('toggle-mini-mode-trigger');
      },
    },
    { type: 'separator' },
    {
      label: 'สถานะ: พร้อมรับฟังคำสั่ง (Always-on)',
      enabled: false,
    },
    {
      label: 'สลับโหมดเงียบ (Mute/Unmute)',
      click: () => {
        mainWindow.webContents.send('toggle-mute-from-tray');
      },
    },
    { type: 'separator' },
    {
      label: 'ออกจากโปรแกรม (Exit)',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}
