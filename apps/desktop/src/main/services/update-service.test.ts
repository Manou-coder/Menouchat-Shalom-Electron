import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createChangeHub } from './change-hub.ts';
import { createUpdateService, type Updater } from './update-service.ts';

class FakeUpdater extends EventEmitter implements Updater {
  autoDownload = false;
  autoInstallOnAppQuit = false;
  checkForUpdates = vi.fn(() => Promise.resolve(undefined));
  quitAndInstall = vi.fn();
}

let updater: FakeUpdater;
const changes = createChangeHub();
const logError = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  updater = new FakeUpdater();
  logError.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

const create = () =>
  createUpdateService({ updater, changes, logError, checkIntervalMs: 6 * 3_600_000 });

describe('update service', () => {
  it('downloads in the background and installs on the next start', () => {
    create();
    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
  });

  it('checks at start and then regularly', () => {
    create().start();
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(6 * 3_600_000);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('reports a version being downloaded, then ready, and tells the admin', () => {
    const service = create();
    const notify = vi.spyOn(changes, 'notify');
    expect(service.status()).toEqual({ status: 'none' });
    updater.emit('update-available', { version: '2.0.1' });
    expect(service.status()).toEqual({ status: 'downloading', version: '2.0.1' });
    updater.emit('update-downloaded', { version: '2.0.1' });
    expect(service.status()).toEqual({ status: 'ready', version: '2.0.1' });
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('installs at once only when an update is ready', () => {
    const service = create();
    service.installNow();
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
    updater.emit('update-downloaded', { version: '2.0.1' });
    service.installNow();
    expect(updater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it('logs failures without throwing: being offline is normal', async () => {
    updater.checkForUpdates.mockRejectedValueOnce(new Error('offline'));
    create().start();
    await vi.runOnlyPendingTimersAsync();
    updater.emit('error', new Error('bad signature'));
    expect(logError).toHaveBeenCalledTimes(2);
  });
});
