import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../public/bobo.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  } else {
    icon = icon.resize({ width: 18, height: 18 });
  }

  tray = new Tray(icon);
  tray.setToolTip('Noar AI (โนอา) — Personal AI Desktop Assistant');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'เปิดหน้าต่างหลัก (Show Noar AI) — Alt+Space',
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
