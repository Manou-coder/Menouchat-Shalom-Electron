import type { DisplayState } from '@menouchat/shared';

import type { ChangeHub } from './change-hub.ts';

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
  changes: ChangeHub;
}

export interface DisplayStateService {
  /** `undefined` when no display has this id. */
  get(displayId: string): Promise<DisplayState | undefined>;
  /** The current snapshot, then a new one after every change and at each local midnight. */
  watch(displayId: string, signal: AbortSignal): AsyncGenerator<DisplayState>;
}

export function createDisplayStateService(
  dependencies: DisplayStateServiceDependencies,
): DisplayStateService {
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

  async function* watch(displayId: string, signal: AbortSignal): AsyncGenerator<DisplayState> {
    while (!signal.aborted) {
      const state = await get(displayId);
      if (state === undefined) {
        return;
      }
      yield state;
      const untilMidnight = state.validUntil - dependencies.now() + MIDNIGHT_MARGIN_MS;
      await dependencies.changes.wait(Math.max(untilMidnight, MIDNIGHT_MARGIN_MS), signal);
    }
  }

  return { get, watch };
}
