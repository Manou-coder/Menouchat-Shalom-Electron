import { useEffect, useState } from 'react';

/** True while the mouse has moved within the last `idleMs`; the display hides its cursor otherwise. */
export function usePointerActivity(idleMs: number): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMove = () => {
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setActive(false);
      }, idleMs);
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      clearTimeout(timer);
    };
  }, [idleMs]);

  return active;
}
