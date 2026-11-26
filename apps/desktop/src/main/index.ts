import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

import { app, dialog, globalShortcut, powerSaveBlocker, session } from 'electron';
import log from 'electron-log/main';
import electronUpdater from 'electron-updater';

import { MAIN_DISPLAY_ID, strings, WEB_DEV_SERVER_PORT } from '@menouchat/shared';

import { hashPin, verifyPin } from './auth/pin-hash.ts';
import { createLoginThrottle, createSessionStore } from './auth/sessions.ts';
import { createServer } from './server/create-server.ts';
import {
  ALL_INTERFACES_HOST,
  createServerListener,
  LOOPBACK_HOST,
} from './server/server-listener.ts';
import { createAdminService } from './services/admin-service.ts';
import { createAuthService } from './services/auth-service.ts';
import { createChangeHub } from './services/change-hub.ts';
import { createDisplayStateService } from './services/display-state-service.ts';
import { localNetworkAddresses } from './services/network-addresses.ts';
import { createUpdateService } from './services/update-service.ts';
import { createStore } from './store/store.ts';
import { importV1IfNeeded } from './v1-import/import-v1.ts';
import { waitForUrl } from './wait-for-url.ts';
import { createWindowManager } from './window.ts';

const DEV_SERVER_TIMEOUT_MS = 30_000;
const ADMIN_SHORTCUT = 'CommandOrControl+Alt+A';
/** Lets the answer to a request reach the page before the server or the app restarts. */
const RESTART_DELAY_MS = 250;
const UPDATE_CHECK_INTERVAL_MS = 6 * 3_600_000;
/** A crash this soon after starting is not retried, so a broken start cannot loop. */
const MIN_UPTIME_BEFORE_RELAUNCH_S = 60;

// v1 stored its data under this folder name; keeping it lets v2 import that data on first
// launch (plan §5) regardless of the product name shown to users.
app.setPath('userData', join(app.getPath('appData'), 'menouchat-chalom'));

function resolveWebRoot(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'web')
    : join(app.getAppPath(), '..', 'web', 'dist');
}

const hostFor = (phoneAccess: boolean) => (phoneAccess ? ALL_INTERFACES_HOST : LOOPBACK_HOST);

async function start(): Promise<void> {
  await app.whenReady();

  // The app never needs camera, microphone, notifications or any other permission.
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // The synagogue screen must never go dark while the app runs (owner's choice).
  powerSaveBlocker.start('prevent-display-sleep');

  const userData = app.getPath('userData');
  // Must run before anything reads or writes userData/data (plan §5).
  const imported = await importV1IfNeeded(userData, log, () => new Date());
  log.info(`v1 import: ${imported.status}`);

  const slidesRoot = join(userData, 'slides');
  const store = createStore(join(userData, 'data'), log);
  const changes = createChangeHub();
  const sessions = createSessionStore(Date.now);
  const settings = await store.settings.read();
  const { port } = settings.lan;

  const { autoUpdater } = electronUpdater;
  autoUpdater.logger = log;
  const updates = createUpdateService({
    updater: autoUpdater,
    changes,
    logError: (message, error) => {
      log.error(message, error);
    },
    checkIntervalMs: UPDATE_CHECK_INTERVAL_MS,
  });
  // Only an installed build knows where its updates come from.
  if (app.isPackaged) {
    updates.start();
  }

  const displayStates = createDisplayStateService({
    readInputs: async () => {
      const [current, schedule, slides, displays] = await Promise.all([
        store.settings.read(),
        store.schedule.read(),
        store.slides.read(),
        store.displays.read(),
      ]);
      return { settings: current, schedule, slides, displays };
    },
    now: Date.now,
    changes,
  });

  const admin = createAdminService({
    store,
    slidesRoot,
    changes,
    hashPin,
    verifyPin,
    onPinChanged: () => {
      sessions.revokeAll();
    },
    onPhoneAccessChanged: (enabled) => {
      setTimeout(() => {
        listener
          .listen(hostFor(enabled))
          .then((address) => {
            log.info(`HTTP server now listening on ${address}`);
          })
          .catch((error: unknown) => {
            log.error('Could not switch phone access:', error);
          });
      }, RESTART_DELAY_MS);
    },
    phoneUrls: (listeningPort) =>
      localNetworkAddresses().map((address) => `http://${address}:${String(listeningPort)}/admin`),
    updateStatus: () => updates.status(),
  });

  const auth = createAuthService({
    sessions,
    throttle: createLoginThrottle(Date.now),
    verifyPin: (pin) => admin.verifyPin(pin),
    isPinSet: async () => (await store.settings.read()).lan.pinHash !== null,
  });

  // Local windows always use the loopback address, whichever interfaces the server is on.
  const appUrl = import.meta.env.DEV
    ? `http://${LOOPBACK_HOST}:${String(WEB_DEV_SERVER_PORT)}`
    : `http://${LOOPBACK_HOST}:${String(port)}`;
  const token = randomBytes(32).toString('base64url');
  const windows = createWindowManager({
    appUrl,
    bridge: { baseUrl: appUrl, token },
    fullScreen: !import.meta.env.DEV,
    onRendererGone: (details) => {
      log.error(`Page crashed, reloading: ${details}`);
    },
  });
  const listener = createServerListener(
    () =>
      createServer({
        version: app.getVersion(),
        token,
        displayStates,
        admin,
        auth,
        desktop: {
          showAdmin: () => {
            windows.showAdmin();
          },
          installUpdate: () => {
            setTimeout(() => {
              updates.installNow();
            }, RESTART_DELAY_MS);
          },
        },
        slidesRoot,
        ...(import.meta.env.DEV ? {} : { webRoot: resolveWebRoot() }),
        onError: (error, path) => {
          log.error(`API error on ${path ?? 'unknown procedure'}:`, error);
        },
      }),
    port,
  );
  const serverUrl = await listener.listen(hostFor(settings.lan.enabled));
  log.info(`HTTP server listening on ${serverUrl}`);

  app.on('before-quit', () => {
    void listener.close();
  });

  if (import.meta.env.DEV) {
    await waitForUrl(appUrl, DEV_SERVER_TIMEOUT_MS);
  }

  app.on('second-instance', () => {
    windows.focusAny();
  });

  // Only the public display opens; its admin button (or Ctrl+Alt+A) opens the admin.
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
}

// A second instance would fail to bind the HTTP port; hand over to the running one instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('window-all-closed', () => {
    app.quit();
  });

  // An unexpected error in the main process restarts the app rather than leaving the
  // synagogue screen frozen (plan §4.6).
  process.on('uncaughtException', (error) => {
    log.error('Fatal error:', error);
    if (process.uptime() > MIN_UPTIME_BEFORE_RELAUNCH_S) {
      app.relaunch();
    }
    app.exit(1);
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
