import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

import { app, dialog, globalShortcut, session } from 'electron';
import log from 'electron-log/main';

import {
  DEFAULT_HTTP_PORT,
  MAIN_DISPLAY_ID,
  strings,
  WEB_DEV_SERVER_PORT,
} from '@menouchat/shared';

import { createServer } from './server/create-server.ts';
import { createDisplayStateService } from './services/display-state-service.ts';
import { createStore } from './store/store.ts';
import { waitForUrl } from './wait-for-url.ts';
import { createWindowManager } from './window.ts';

const LOOPBACK_HOST = '127.0.0.1';
const DEV_SERVER_TIMEOUT_MS = 30_000;
const ADMIN_SHORTCUT = 'CommandOrControl+Alt+A';

// v1 stored its data under this folder name; keeping it lets v2 import that data on first
// launch (plan §5) regardless of the product name shown to users.
app.setPath('userData', join(app.getPath('appData'), 'menouchat-chalom'));

function resolveWebRoot(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'web')
    : join(app.getAppPath(), '..', 'web', 'dist');
}

async function start(): Promise<void> {
  await app.whenReady();

  // The app never needs camera, microphone, notifications or any other permission.
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  const userData = app.getPath('userData');
  const store = createStore(join(userData, 'data'), log);
  const displayStates = createDisplayStateService({
    readInputs: async () => {
      const [settings, schedule, slides, displays] = await Promise.all([
        store.settings.read(),
        store.schedule.read(),
        store.slides.read(),
        store.displays.read(),
      ]);
      return { settings, schedule, slides, displays };
    },
    now: Date.now,
  });

  const token = randomBytes(32).toString('base64url');
  const server = await createServer({
    version: app.getVersion(),
    token,
    displayStates,
    slidesRoot: join(userData, 'slides'),
    ...(import.meta.env.DEV ? {} : { webRoot: resolveWebRoot() }),
    onError: (error, path) => {
      log.error(`API error on ${path ?? 'unknown procedure'}:`, error);
    },
  });
  const serverUrl = await server.listen({ host: LOOPBACK_HOST, port: DEFAULT_HTTP_PORT });
  log.info(`HTTP server listening on ${serverUrl}`);

  app.on('before-quit', () => {
    void server.close();
  });

  const appUrl = import.meta.env.DEV
    ? `http://${LOOPBACK_HOST}:${String(WEB_DEV_SERVER_PORT)}`
    : serverUrl;
  if (import.meta.env.DEV) {
    await waitForUrl(appUrl, DEV_SERVER_TIMEOUT_MS);
  }

  const windows = createWindowManager({
    appUrl,
    bridge: { baseUrl: appUrl, token },
    kiosk: !import.meta.env.DEV,
  });
  app.on('second-instance', () => {
    windows.focusAny();
  });

  // The public display starts full screen; the admin opens on demand (plan §4.6).
  windows.showDisplay(MAIN_DISPLAY_ID);
  if (
    !globalShortcut.register(ADMIN_SHORTCUT, () => {
      windows.showAdmin();
    })
  ) {
    log.warn(`Could not register the ${ADMIN_SHORTCUT} shortcut`);
  }
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
  if (import.meta.env.DEV) {
    windows.showAdmin();
  }
}

// A second instance would fail to bind the HTTP port; hand over to the running one instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('window-all-closed', () => {
    app.quit();
  });

  start().catch((error: unknown) => {
    log.error('Startup failed:', error);
    dialog.showErrorBox(
      strings.desktop.startupFailed,
      error instanceof Error ? error.message : String(error),
    );
    app.exit(1);
  });
}
