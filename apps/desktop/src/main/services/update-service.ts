import type { UpdateStatus } from '@menouchat/shared';

import type { ChangeHub } from './change-hub.ts';

/** The part of electron-updater's `autoUpdater` this service uses. */
export interface Updater {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates(): Promise<unknown>;
  quitAndInstall(): void;
  on(
    event: 'update-available' | 'update-downloaded',
    listener: (info: { version: string }) => void,
  ): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
}

export interface UpdateServiceDependencies {
  updater: Updater;
  changes: ChangeHub;
  logError: (message: string, error: unknown) => void;
  /** How often GitHub is asked for a newer release. */
  checkIntervalMs: number;
}

export interface UpdateService {
  status(): UpdateStatus;
  /** Checks now, then every `checkIntervalMs`. */
  start(): void;
  /** Restarts into the downloaded version; does nothing when none is ready. */
  installNow(): void;
}

/**
 * Updates download in the background and install the next time the app starts (owner's
 * choice); the admin shows when one is ready and can install it at once.
 */
export function createUpdateService(dependencies: UpdateServiceDependencies): UpdateService {
  const { updater, changes } = dependencies;
  let current: UpdateStatus = { status: 'none' };

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('update-available', ({ version }) => {
    current = { status: 'downloading', version };
    changes.notify();
  });
  updater.on('update-downloaded', ({ version }) => {
    current = { status: 'ready', version };
    changes.notify();
  });
  updater.on('error', (error) => {
    dependencies.logError('Update check failed:', error);
  });

  function check(): void {
    updater.checkForUpdates().catch((error: unknown) => {
      dependencies.logError('Update check failed:', error);
    });
  }

  return {
    status: () => current,
    start() {
      check();
      setInterval(check, dependencies.checkIntervalMs);
    },
    installNow() {
      if (current.status === 'ready') {
        updater.quitAndInstall();
      }
    },
  };
}
