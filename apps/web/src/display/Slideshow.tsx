import { useEffect, useState } from 'react';

import { strings } from '@menouchat/shared';

export interface SlideshowProps {
  pages: readonly { key: string; url: string }[];
  intervalSec: number;
}

/**
 * Cycles through slide pages with a cross-fade; every page stays mounted so it is preloaded.
 * Renders nothing without pages: the layout's empty frame shows instead.
 */
export function Slideshow({ pages, intervalSec }: SlideshowProps) {
  const [index, setIndex] = useState(0);
  const current = pages.length === 0 ? 0 : index % pages.length;

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

  return (
    <div className="relative size-full">
      {pages.map((item, position) => (
        <img
          key={item.key}
          src={item.url}
          alt={strings.display.slideAlt}
          aria-hidden={position !== current}
          className="absolute inset-0 size-full object-contain transition-opacity duration-[1500ms] ease-in-out"
          style={{ opacity: position === current ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
