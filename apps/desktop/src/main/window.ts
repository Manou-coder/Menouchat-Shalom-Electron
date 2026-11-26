import { join } from 'node:path';

import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';

import { encodeDesktopBridge, DESKTOP_BRIDGE_SWITCH, type DesktopBridge } from '@menouchat/shared';

const PRELOAD_PATH = join(import.meta.dirname, '../preload/index.cjs');

/** The classic-portrait design surface, used for the windowed display in development. */
const DISPLAY_WINDOW_SIZE = { width: 540, height: 960 };

export interface WindowManagerOptions {
  /** Origin of the web app: the embedded server, or the Vite dev server in development. */
  appUrl: string;
  bridge: DesktopBridge;
  /** Full-screen display (production) or a 540 × 960 window (development). */
  fullScreen: boolean;
  /** Logs why a window's page had to be reloaded. */
  onRendererGone: (details: string) => void;
}

export interface WindowManager {
  /** Opens a display window, or brings it to the front when it is already open. */
  showDisplay(displayId: string): void;
  /** Opens the admin, or brings it to the front when it is already open. */
  showAdmin(): void;
  focusAny(): void;
}

export function createWindowManager(options: WindowManagerOptions): WindowManager {
  let admin: BrowserWindow | undefined;
  const displays = new Map<string, BrowserWindow>();

  function create(path: string, windowOptions: BrowserWindowConstructorOptions): BrowserWindow {
    const window = new BrowserWindow({
      ...windowOptions,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        additionalArguments: [`--${DESKTOP_BRIDGE_SWITCH}=${encodeDesktopBridge(options.bridge)}`],
      },
    });

    // Windows only ever show our own web app: no pop-ups, no navigation elsewhere.
    const allowedOrigin = new URL(options.appUrl).origin;
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, target) => {
      if (new URL(target).origin !== allowedOrigin) {
        event.preventDefault();
      }
    });
    // A crashed page would leave the synagogue screen blank: load it again.
    window.webContents.on('render-process-gone', (_event, details) => {
      options.onRendererGone(`${path}: ${details.reason}`);
      if (!window.isDestroyed()) {
        window.reload();
      }
    });
    window.once('ready-to-show', () => {
      window.show();
    });
    void window.loadURL(new URL(path, options.appUrl).href);
    return window;
  }

  function bringToFront(window: BrowserWindow): void {
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
  }

  return {
    showDisplay(displayId) {
      const existing = displays.get(displayId);
      if (existing !== undefined && !existing.isDestroyed()) {
        bringToFront(existing);
        return;
      }
      const window = create(
        `/display/${encodeURIComponent(displayId)}`,
        options.fullScreen
          ? { fullscreen: true, backgroundColor: '#000000' }
          : { ...DISPLAY_WINDOW_SIZE, useContentSize: true, backgroundColor: '#000000' },
      );
      // Plain full screen (owner's choice, not kiosk): Escape leaves it, F11 toggles it.
      window.webContents.on('before-input-event', (_event, input) => {
        if (input.type === 'keyDown' && input.key === 'Escape' && window.isFullScreen()) {
          window.setFullScreen(false);
        }
      });
      displays.set(displayId, window);
      window.on('closed', () => displays.delete(displayId));
    },

    showAdmin() {
      if (admin !== undefined && !admin.isDestroyed()) {
        bringToFront(admin);
        return;
      }
      admin = create('/admin', { width: 1280, height: 800 });
      admin.on('closed', () => {
        admin = undefined;
      });
    },

    focusAny() {
      const target = admin ?? displays.values().next().value;
      if (target !== undefined && !target.isDestroyed()) {
        bringToFront(target);
      }
    },
  };
}
