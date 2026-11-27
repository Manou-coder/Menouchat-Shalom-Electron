import { useEffect, useState } from 'react';

import { strings } from '@menouchat/shared';

export interface SlideshowProps {
  pages: readonly { key: string; url: string }[];
  intervalSec: number;
}

type Page = SlideshowProps['pages'][number];

/** v1's fade: each picture appeared over 3 s. */
export const FADE_MS = 3_000;

/**
 * Cycles through slide pages with a cross-fade; every page stays mounted so it is preloaded.
 * Renders nothing without pages: the layout's empty frame shows instead.
 *
 * Every picture that comes into view fades in over the one before, including the first one,
 * a replaced picture and a newly added one: a picture is mounted transparent and only shown
 * once loaded, on top of the previous one. The previous one stays visible beneath until the
 * fade ends, then fades out itself (its edges may show around a picture of other proportions),
 * even if it has already left `pages`.
 */
export function Slideshow({ pages, intervalSec }: SlideshowProps) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  // The picture shown on top, and the one it is fading in over.
  const [top, setTop] = useState<Page>();
  const [beneath, setBeneath] = useState<{ page: Page; fadingOut: boolean }>();

  const target = pages.length === 0 ? undefined : pages[index % pages.length];

  // Derived during render rather than in an effect, so the new picture is promoted in the
  // same pass that notices it has loaded.
  if (target === undefined) {
    if (top !== undefined) {
      setTop(undefined);
      setBeneath(undefined);
    }
  } else if (loaded.has(target.key) && top?.key !== target.key) {
    setBeneath(top === undefined ? undefined : { page: top, fadingOut: false });
    setTop(target);
  }

  useEffect(() => {
    if (pages.length < 2) {
      return undefined;
    }
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % pages.length);
    }, intervalSec * 1_000);
    return () => {
      clearInterval(timer);
    };
  }, [pages.length, intervalSec]);

  // Once the picture on top has fully faded in, the one beneath fades out, then is let go.
  useEffect(() => {
    if (beneath === undefined) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setBeneath(beneath.fadingOut ? undefined : { ...beneath, fadingOut: true });
    }, FADE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [beneath]);

  function markLoaded(key: string) {
    setLoaded((keys) => (keys.has(key) ? keys : new Set(keys).add(key)));
  }

  if (pages.length === 0) {
    return <div className="relative size-full" />;
  }

  // A picture removed from `pages` while still in view stays mounted until it is let go:
  // the replaced picture stays on top until its replacement has loaded, then fades out.
  const leaving = [top, beneath?.page].filter(
    (page, position, all): page is Page =>
      page !== undefined &&
      !pages.some((other) => other.key === page.key) &&
      all.findIndex((other) => other?.key === page.key) === position,
  );
  const layers = [...pages, ...leaving];
  // The picture beneath, while it is still in full view under the one on top.
  const heldKey = beneath === undefined || beneath.fadingOut ? undefined : beneath.page.key;

  return (
    <div className="relative size-full">
      {layers.map((item) => {
        const isTop = item.key === top?.key;
        const isBeneath = item.key === beneath?.page.key;
        const holdsBeneath = item.key === heldKey;
        return (
          <img
            key={item.key}
            src={item.url}
            alt={strings.display.slideAlt}
            aria-hidden={!isTop}
            onLoad={() => {
              markLoaded(item.key);
            }}
            // A broken picture must not hold the slideshow up: it takes its turn like the others.
            onError={() => {
              markLoaded(item.key);
            }}
            className="absolute inset-0 size-full object-contain"
            style={{
              opacity: isTop || holdsBeneath ? 1 : 0,
              zIndex: isTop ? 2 : isBeneath ? 1 : 0,
              transition: `opacity ${String(FADE_MS)}ms ease-in-out`,
            }}
          />
        );
      })}
    </div>
  );
}
