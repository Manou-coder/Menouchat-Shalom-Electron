import { useEffect } from 'react';

/**
 * Asks before the page is closed or left while `dirty`. In the desktop app the main process
 * turns this into a dialog (see window.ts); a phone's browser shows its own.
 */
export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) {
      return undefined;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty]);
}
