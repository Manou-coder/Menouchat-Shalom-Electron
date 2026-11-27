// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FADE_MS, Slideshow } from './Slideshow.tsx';

const pages = [
  { key: 'a/page-1.jpg', url: '/slides/a/page-1.jpg' },
  { key: 'a/page-2.jpg', url: '/slides/a/page-2.jpg' },
  { key: 'b/page-1.jpg', url: '/slides/b/page-1.jpg' },
];

function images(): HTMLElement[] {
  return screen.queryAllByRole('img', { hidden: true });
}

function image(url: string): HTMLElement {
  const found = images().find((element) => element.getAttribute('src') === url);
  if (found === undefined) throw new Error(`No image for ${url}`);
  return found;
}

/** jsdom loads no pictures: tell the slideshow they arrived, as a browser would. */
function loadAll() {
  for (const element of images()) {
    fireEvent.load(element);
  }
}

/** The picture in front: shown, and above any picture it is fading in over. */
function topUrl(): string | null {
  const shown = images().filter((element) => element.style.opacity === '1');
  const front = shown.toSorted((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
  return front?.getAttribute('src') ?? null;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
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

  it('fades the first picture in once it has loaded, over 3 s as in v1', () => {
    render(<Slideshow pages={pages} intervalSec={10} />);
    const first = image('/slides/a/page-1.jpg');
    expect(first.style.opacity).toBe('0');
    expect(first.style.transition).toBe(`opacity ${String(FADE_MS)}ms ease-in-out`);
    expect(FADE_MS).toBe(3_000);
    loadAll();
    expect(first.style.opacity).toBe('1');
  });

  it('shows every page in turn, one interval each, then starts again', () => {
    render(<Slideshow pages={pages} intervalSec={10} />);
    loadAll();
    expect(topUrl()).toBe('/slides/a/page-1.jpg');
    advance(10_000);
    expect(topUrl()).toBe('/slides/a/page-2.jpg');
    advance(10_000);
    expect(topUrl()).toBe('/slides/b/page-1.jpg');
    advance(10_000);
    expect(topUrl()).toBe('/slides/a/page-1.jpg');
  });

  it('keeps the previous picture beneath until the new one has faded in, then fades it out', () => {
    render(<Slideshow pages={pages} intervalSec={10} />);
    loadAll();
    advance(10_000);
    const previous = image('/slides/a/page-1.jpg');
    const next = image('/slides/a/page-2.jpg');
    expect(next.style.opacity).toBe('1');
    expect(Number(next.style.zIndex)).toBeGreaterThan(Number(previous.style.zIndex));
    expect(previous.style.opacity).toBe('1');
    advance(FADE_MS);
    expect(previous.style.opacity).toBe('0');
  });

  it('keeps every page mounted so the next one is already loaded', () => {
    render(<Slideshow pages={pages} intervalSec={10} />);
    expect(images()).toHaveLength(3);
  });

  it('stays on a single page', () => {
    render(<Slideshow pages={pages.slice(0, 1)} intervalSec={3} />);
    loadAll();
    advance(60_000);
    expect(topUrl()).toBe('/slides/a/page-1.jpg');
  });

  it('copes with the list shrinking under the current page', () => {
    const { rerender } = render(<Slideshow pages={pages} intervalSec={10} />);
    loadAll();
    advance(20_000);
    rerender(<Slideshow pages={pages.slice(0, 2)} intervalSec={10} />);
    expect(topUrl()).toBe('/slides/a/page-1.jpg');
  });

  it('cross-fades a replaced picture: the old one stays until the new one has loaded', () => {
    const { rerender } = render(<Slideshow pages={pages.slice(0, 1)} intervalSec={10} />);
    loadAll();
    const replaced = [{ key: 'c/page-1.jpg', url: '/slides/c/page-1.jpg' }];
    rerender(<Slideshow pages={replaced} intervalSec={10} />);

    // Still loading: the old picture stays in view, the new one waits transparent.
    expect(topUrl()).toBe('/slides/a/page-1.jpg');
    const incoming = image('/slides/c/page-1.jpg');
    expect(incoming.style.opacity).toBe('0');

    fireEvent.load(incoming);
    expect(topUrl()).toBe('/slides/c/page-1.jpg');
    expect(image('/slides/a/page-1.jpg').style.opacity).toBe('1');

    advance(FADE_MS);
    expect(image('/slides/a/page-1.jpg').style.opacity).toBe('0');
    advance(FADE_MS);
    expect(images().map((element) => element.getAttribute('src'))).toEqual([
      '/slides/c/page-1.jpg',
    ]);
  });

  it('fades in a picture that becomes current because one was added', () => {
    const { rerender } = render(<Slideshow pages={pages.slice(0, 2)} intervalSec={10} />);
    loadAll();
    advance(10_000);
    advance(FADE_MS * 2);
    expect(topUrl()).toBe('/slides/a/page-2.jpg');
    // The index (1) now points at the added slide.
    const [first, second] = pages;
    if (first === undefined || second === undefined) throw new Error('Expected two pages');
    const added = { key: 'z/page-1.jpg', url: '/slides/z/page-1.jpg' };
    rerender(<Slideshow pages={[first, added, second]} intervalSec={10} />);
    const incoming = image(added.url);
    expect(incoming.style.opacity).toBe('0');
    expect(topUrl()).toBe('/slides/a/page-2.jpg');
    fireEvent.load(incoming);
    expect(topUrl()).toBe(added.url);
  });

  it('moves on past a picture that fails to load', () => {
    render(<Slideshow pages={pages.slice(0, 2)} intervalSec={10} />);
    fireEvent.error(image('/slides/a/page-1.jpg'));
    expect(topUrl()).toBe('/slides/a/page-1.jpg');
  });
});
