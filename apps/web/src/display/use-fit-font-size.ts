import { useLayoutEffect, useRef, useState } from 'react';

/**
 * A font size for one line of text: `size`, or smaller if the text would be wider than
 * `maxWidth` at that size. For names typed in the admin, whose length nobody controls.
 */
export function useFitFontSize<T extends HTMLElement>(
  text: string,
  size: number,
  maxWidth: number,
) {
  const ref = useRef<T>(null);
  const [fitted, setFitted] = useState(size);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return undefined;
    }
    let active = true;
    const fit = () => {
      // offsetWidth ignores the surface's CSS scale: this is the width on the layout's surface.
      element.style.fontSize = `${String(size)}px`;
      const width = element.offsetWidth;
      element.style.fontSize = '';
      if (active) {
        setFitted(width > maxWidth ? Math.floor((size * maxWidth * 10) / width) / 10 : size);
      }
    };
    fit();
    // Measure again once the web fonts have loaded: the fallback font has other widths.
    void document.fonts.ready.then(fit);
    return () => {
      active = false;
    };
  }, [text, size, maxWidth]);

  return { ref, fontSize: fitted };
}
