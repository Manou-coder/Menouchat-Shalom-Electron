// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { strings } from '@menouchat/shared';

import { useAction } from './use-action.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAction', () => {
  it('is pending while the request runs, then done for two seconds', async () => {
    let finish: () => void = () => undefined;
    const { result } = renderHook(() =>
      useAction(() => new Promise<void>((resolve) => (finish = resolve))),
    );

    let running: Promise<boolean> = Promise.resolve(false);
    act(() => {
      running = result.current.run();
    });
    expect(result.current.pending).toBe(true);

    await act(async () => {
      finish();
      await running;
    });
    expect(result.current).toMatchObject({ pending: false, done: true, error: undefined });

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.done).toBe(false);
  });

  it('keeps the error until the next attempt', async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAction(action));

    await act(async () => {
      await result.current.run();
    });
    expect(result.current).toMatchObject({ done: false, error: strings.admin.errors.generic });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.error).toBe(strings.admin.errors.generic);

    await act(async () => {
      await result.current.run();
    });
    expect(result.current).toMatchObject({ done: true, error: undefined });
  });
});
