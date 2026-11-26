// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePointerActivity } from './use-pointer-activity.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const move = () => {
  act(() => {
    window.dispatchEvent(new Event('pointermove'));
  });
};

describe('usePointerActivity', () => {
  it('is idle until the mouse moves, then idle again three seconds after it stops', () => {
    const { result } = renderHook(() => usePointerActivity(3_000));
    expect(result.current).toBe(false);
    move();
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    move();
    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toBe(false);
  });
});
