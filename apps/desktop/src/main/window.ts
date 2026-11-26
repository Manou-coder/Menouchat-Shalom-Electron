import { join } from 'node:path';

import { BrowserWindow } from 'electron';

import { encodeDesktopBridge, DESKTOP_BRIDGE_SWITCH, type DesktopBridge } from '@menouchat/shared';

const PRELOAD_PATH = join(import.meta.dirname, '../preload/index.cjs');

export interface AppWindowOptions {
  url: string;
  bridge: DesktopBridge;
}

export async function openAppWindow({ url, bridge }: AppWindowOptions): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      additionalArguments: [`--${DESKTOP_BRIDGE_SWITCH}=${encodeDesktopBridge(bridge)}`],
    },
  });

  // The window only ever shows our own web app: no pop-ups, no navigation elsewhere.
  const allowedOrigin = new URL(url).origin;
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => {
    if (new URL(target).origin !== allowedOrigin) {
      event.preventDefault();
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });
  await window.loadURL(url);
  return window;
}
