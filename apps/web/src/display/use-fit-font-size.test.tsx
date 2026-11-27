// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { useFitFontSize } from './use-fit-font-size.ts';

let fontsReady: () => void = () => undefined;

beforeAll(() => {
  Object.defineProperty(document, 'fonts', {
    value: {
      ready: new Promise<void>((resolve) => {
        fontsReady = resolve;
      }),
    },
    configurable: true,
  });
  // jsdom lays nothing out: make a text 10 px wide per pixel of font size.
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return Number.parseFloat(this.style.fontSize || '0') * 10;
  });
});

afterEach(cleanup);

function Label({ maxWidth }: { maxWidth: number }) {
  const { ref, fontSize } = useFitFontSize<HTMLSpanElement>('שיר השירים', 30, maxWidth);
  return (
    <span ref={ref} style={{ fontSize }}>
      שיר השירים
    </span>
  );
}

describe('useFitFontSize', () => {
  it('keeps a text that fits at its size', () => {
    render(<Label maxWidth={400} />);
    expect(screen.getByText('שיר השירים').style.fontSize).toBe('30px');
  });

  it('shrinks a text that is too wide, and keeps it shrunk once the fonts load', async () => {
    render(<Label maxWidth={200} />);
    const label = screen.getByText('שיר השירים');
    expect(label.style.fontSize).toBe('20px');
    await act(async () => {
      fontsReady();
      await Promise.resolve();
    });
    // Measuring again must not leave the label without the size React gave it.
    expect(label.style.fontSize).toBe('20px');
  });
});
