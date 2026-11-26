import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

import { app, dialog, session, type BrowserWindow } from 'electron';
import log from 'electron-log/main';

import { DEFAULT_HTTP_PORT, strings, WEB_DEV_SERVER_PORT } from '@menouchat/shared';

import { createServer } from './server/create-server.ts';
import { waitForUrl } from './wait-for-url.ts';
import { openAppWindow } from './window.ts';

const LOOPBACK_HOST = '127.0.0.1';
const DEV_SERVER_TIMEOUT_MS = 30_000;

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

  const token = randomBytes(32).toString('base64url');
  const server = await createServer({
    version: app.getVersion(),
    token,
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

  const window = await openAppWindow({
    url: `${appUrl}/admin`,
    bridge: { baseUrl: appUrl, token },
  });
  focusOnSecondInstance(window);
}

function focusOnSecondInstance(window: BrowserWindow): void {
  app.on('second-instance', () => {
    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
  });
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
