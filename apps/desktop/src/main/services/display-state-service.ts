import type { DisplayState } from '@menouchat/shared';

import {
  buildDisplayState,
  DisplayNotFoundError,
  type DisplayInputs,
} from './build-display-state.ts';

// Waking a little after local midnight keeps the new day's snapshot clear of clock skew.
const MIDNIGHT_MARGIN_MS = 1_000;

export interface DisplayStateServiceDependencies {
  readInputs: () => Promise<DisplayInputs>;
  now: () => number;
}

export interface DisplayStateService {
  /** `undefined` when no display has this id. */
  get(displayId: string): Promise<DisplayState | undefined>;
  /** The current snapshot, then a new one after every change and at each local midnight. */
  watch(displayId: string, signal: AbortSignal): AsyncGenerator<DisplayState>;
  /** Must be called after any change to settings, schedule, slides or displays. */
  notifyChanged(): void;
}

export function createDisplayStateService(
  dependencies: DisplayStateServiceDependencies,
): DisplayStateService {
  const waiters = new Set<() => void>();

  async function get(displayId: string): Promise<DisplayState | undefined> {
    try {
      return buildDisplayState(await dependencies.readInputs(), displayId, dependencies.now());
    } catch (error) {
      if (error instanceof DisplayNotFoundError) {
        return undefined;
      }
      throw error;
    }
  }

  function waitForChange(delayMs: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        waiters.delete(done);
        signal.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, delayMs);
      waiters.add(done);
      signal.addEventListener('abort', done, { once: true });
    });
  }

  async function* watch(displayId: string, signal: AbortSignal): AsyncGenerator<DisplayState> {
    while (!signal.aborted) {
      const state = await get(displayId);
      if (state === undefined) {
        return;
      }
      yield state;
      const untilMidnight = state.validUntil - dependencies.now() + MIDNIGHT_MARGIN_MS;
      await waitForChange(Math.max(untilMidnight, MIDNIGHT_MARGIN_MS), signal);
    }
  }

  return {
    get,
    watch,
    notifyChanged() {
      for (const wake of [...waiters]) {
        wake();
      }
    },
  };
}
