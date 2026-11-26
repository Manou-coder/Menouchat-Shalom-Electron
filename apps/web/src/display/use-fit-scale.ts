import { useEffect, useState } from 'react';

/** The largest scale at which a `width` × `height` surface fits the window. */
export function useFitScale(width: number, height: number): number {
  const compute = () => Math.min(window.innerWidth / width, window.innerHeight / height);
  const [scale, setScale] = useState(compute);

  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
    };
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, [width, height]);

  return scale;
}
