import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';

import { createServer } from '../server/create-server.ts';
import { createAdminService, type AdminService } from '../services/admin-service.ts';
import { createChangeHub, type ChangeHub } from '../services/change-hub.ts';
import { createDisplayStateService } from '../services/display-state-service.ts';
import { createStore, type Store } from '../store/store.ts';

export const TEST_TOKEN = 'test-token-'.padEnd(43, 'x');
export const TEST_VERSION = '2.0.0-test';

export interface TestApp {
  server: FastifyInstance;
  store: Store;
  admin: AdminService;
  changes: ChangeHub;
  slidesRoot: string;
  /** Calls the API made to the desktop app (open admin, check for and install updates). */
  desktopCalls: string[];
  dispose(): Promise<void>;
}

/** The real server and services over a temporary userData folder. */
export async function createTestApp(
  options: { webRoot?: string; now?: () => number } = {},
): Promise<TestApp> {
  const userData = await mkdtemp(join(tmpdir(), 'menouchat-app-'));
  const slidesRoot = join(userData, 'slides');
  const store = createStore(join(userData, 'data'), {
    info: () => undefined,
    warn: () => undefined,
  });
  const changes = createChangeHub();
  const now = options.now ?? Date.now;
  const desktopCalls: string[] = [];

  const admin = createAdminService({
    store,
    slidesRoot,
    changes,
    phoneUrls: (port) => [`http://192.168.1.10:${String(port)}/admin`],
    updateStatus: () => ({ status: 'ready', version: '2.0.1' }),
  });

  const server = await createServer({
    version: TEST_VERSION,
    token: TEST_TOKEN,
    displayStates: createDisplayStateService({
      readInputs: async () => ({
        settings: await store.settings.read(),
        schedule: await store.schedule.read(),
        slides: await store.slides.read(),
        displays: await store.displays.read(),
      }),
      now,
      changes,
    }),
    admin,
    desktop: {
      showAdmin: () => desktopCalls.push('showAdmin'),
      installUpdate: () => desktopCalls.push('installUpdate'),
      checkForUpdate: () => {
        desktopCalls.push('checkForUpdate');
        return Promise.resolve({ result: 'upToDate' });
      },
    },
    slidesRoot,
    onError: () => undefined,
    ...(options.webRoot === undefined ? {} : { webRoot: options.webRoot }),
  });

  return {
    server,
    store,
    admin,
    changes,
    slidesRoot,
    desktopCalls,
    async dispose() {
      await server.close();
      await rm(userData, { recursive: true, force: true });
    },
  };
}
