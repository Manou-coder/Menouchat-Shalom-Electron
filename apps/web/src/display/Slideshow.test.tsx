// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Slideshow } from './Slideshow.tsx';

const pages = [
  { key: 'a/page-1.jpg', url: '/slides/a/page-1.jpg' },
  { key: 'a/page-2.jpg', url: '/slides/a/page-2.jpg' },
  { key: 'b/page-1.jpg', url: '/slides/b/page-1.jpg' },
];

function visibleUrl(): string | null {
  const visible = screen
    .getAllByRole('img', { hidden: true })
    .filter((image) => image.style.opacity === '1');
  expect(visible).toHaveLength(1);
  return visible[0]?.getAttribute('src') ?? null;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Slideshow', () => {
  it('renders nothing without pages', () => {
    const { container } = render(<Slideshow pages={[]} intervalSec={10} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('shows every page in turn, one interval each, then starts again', () => {
    render(<Slideshow pages={pages} intervalSec={10} />);
    expect(visibleUrl()).toBe('/slides/a/page-1.jpg');
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(visibleUrl()).toBe('/slides/a/page-2.jpg');
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(visibleUrl()).toBe('/slides/b/page-1.jpg');
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(visibleUrl()).toBe('/slides/a/page-1.jpg');
  });

  it('keeps every page mounted so the next one is already loaded', () => {
    render(<Slideshow pages={pages} intervalSec={10} />);
    expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(3);
  });

  it('stays on a single page', () => {
    render(<Slideshow pages={pages.slice(0, 1)} intervalSec={3} />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(visibleUrl()).toBe('/slides/a/page-1.jpg');
  });

  it('copes with the list shrinking under the current page', () => {
    const { rerender } = render(<Slideshow pages={pages} intervalSec={10} />);
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    rerender(<Slideshow pages={pages.slice(0, 2)} intervalSec={10} />);
    expect(visibleUrl()).toBe('/slides/a/page-1.jpg');
  });
});
