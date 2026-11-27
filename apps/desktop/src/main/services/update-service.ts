import type { UpdateCheckResult, UpdateStatus } from '@menouchat/shared';

import type { ChangeHub } from './change-hub.ts';

/** The part of electron-updater's `autoUpdater` this service uses. */
export interface Updater {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  /** `null` when the updater is inactive (not an installed build). */
  checkForUpdates(): Promise<{
    isUpdateAvailable: boolean;
    updateInfo: { version: string };
  } | null>;
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
  /** False outside an installed build, which does not know where its updates come from. */
  enabled: boolean;
}

export interface UpdateService {
  status(): UpdateStatus;
  /** Checks now, then every `checkIntervalMs`; does nothing when updates are disabled. */
  start(): void;
  /** Checks at once for the admin; a version found downloads like any other. */
  checkNow(): Promise<UpdateCheckResult>;
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
      if (!dependencies.enabled) {
        return;
      }
      check();
      setInterval(check, dependencies.checkIntervalMs);
    },
    async checkNow() {
      if (!dependencies.enabled) {
        return { result: 'disabled' };
      }
      // Asking again would only restart a download already under way.
      if (current.status !== 'none') {
        return { result: 'found', version: current.version };
      }
      try {
        const found = await updater.checkForUpdates();
        if (found === null) {
          return { result: 'disabled' };
        }
        return found.isUpdateAvailable
          ? { result: 'found', version: found.updateInfo.version }
          : { result: 'upToDate' };
      } catch (error) {
        dependencies.logError('Update check failed:', error);
        return { result: 'failed' };
      }
    },
    installNow() {
      if (current.status === 'ready') {
        updater.quitAndInstall();
      }
    },
  };
}
