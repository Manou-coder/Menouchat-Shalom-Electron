// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDraft } from './use-draft.ts';

describe('useDraft', () => {
  it('follows the server while untouched', () => {
    const { result, rerender } = renderHook(({ server }) => useDraft(server), {
      initialProps: { server: { arvit: '20:10' } },
    });
    expect(result.current.dirty).toBe(false);
    rerender({ server: { arvit: '20:30' } });
    expect(result.current.draft).toEqual({ arvit: '20:30' });
    expect(result.current.dirty).toBe(false);
  });

  it('keeps an edit when the server changes underneath, and can be reset', () => {
    const { result, rerender } = renderHook(({ server }) => useDraft(server), {
      initialProps: { server: { arvit: '20:10' } },
    });
    act(() => {
      result.current.setDraft({ arvit: '19:55' });
    });
    expect(result.current.dirty).toBe(true);
    rerender({ server: { arvit: '20:30' } });
    expect(result.current.draft).toEqual({ arvit: '19:55' });
    act(() => {
      result.current.reset();
    });
    expect(result.current.draft).toEqual({ arvit: '20:30' });
  });

  it('is clean again once the server holds the saved value', () => {
    const { result, rerender } = renderHook(({ server }) => useDraft(server), {
      initialProps: { server: { arvit: '20:10' } },
    });
    act(() => {
      result.current.setDraft({ arvit: '19:55' });
    });
    rerender({ server: { arvit: '19:55' } });
    expect(result.current.dirty).toBe(false);
  });
});
