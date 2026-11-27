import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultDisplays,
  createDefaultSchedule,
  createDefaultSettings,
  createDefaultSlides,
  type DisplayState,
} from '@menouchat/shared';

import type { DisplayInputs } from './build-display-state.ts';
import { createChangeHub } from './change-hub.ts';
import { createDisplayStateService } from './display-state-service.ts';

let inputs: DisplayInputs;

beforeEach(() => {
  vi.useFakeTimers({ now: Date.UTC(2026, 10, 27, 10) });
  inputs = {
    settings: createDefaultSettings(),
    schedule: createDefaultSchedule(),
    slides: createDefaultSlides(),
    displays: createDefaultDisplays(),
  };
});

afterEach(() => {
  vi.useRealTimers();
});

const changes = createChangeHub();

function createService() {
  return createDisplayStateService({
    readInputs: () => Promise.resolve(inputs),
    now: Date.now,
    changes,
  });
}

describe('display state service', () => {
  it('returns undefined for an unknown display', async () => {
    await expect(createService().get('lobby')).resolves.toBeUndefined();
  });

  it('pushes a new snapshot when notified of a change', async () => {
    const service = createService();
    const controller = new AbortController();
    const states = service.watch('main', controller.signal);

    const first = await states.next();
    expect((first.value as DisplayState).schedule.weekday[0]?.time).toBe('06:20');

    inputs.schedule = {
      ...inputs.schedule,
      weekday: [{ id: 'early', name: 'שחרית', time: '06:45' }],
    };
    const next = states.next();
    changes.notify();
    expect(((await next).value as DisplayState).schedule.weekday[0]?.time).toBe('06:45');
    controller.abort();
  });

  it('pushes the next day after local midnight without any change', async () => {
    const service = createService();
    const controller = new AbortController();
    const states = service.watch('main', controller.signal);
    await states.next();

    const next = states.next();
    // Midnight in Jerusalem is 22:00 UTC; the service wakes just after it.
    await vi.advanceTimersByTimeAsync(12 * 3_600_000 + 2_000);
    expect(((await next).value as DisplayState).date).toEqual({ year: 2026, month: 11, day: 28 });
    controller.abort();
  });

  it('stops when the subscriber goes away', async () => {
    const service = createService();
    const controller = new AbortController();
    const states = service.watch('main', controller.signal);
    await states.next();
    const next = states.next();
    controller.abort();
    await expect(next).resolves.toEqual({ done: true, value: undefined });
  });

  it('ends the stream when the display is removed', async () => {
    const service = createService();
    const controller = new AbortController();
    const states = service.watch('main', controller.signal);
    await states.next();
    inputs.displays = { ...inputs.displays, displays: [] };
    const next = states.next();
    changes.notify();
    await expect(next).resolves.toEqual({ done: true, value: undefined });
  });
});
