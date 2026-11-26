import { useEffect, useRef, useState } from 'react';

import { errorMessage } from './errors.ts';

/** How long the button says "saved" before going back to normal. */
const DONE_MS = 2_000;

/**
 * Runs a request and reports it where it happened: `pending` while it runs (a spinner in
 * the button), `done` for two seconds after it succeeds, `error` until the next attempt.
 */
export function useAction<Args extends unknown[]>(action: (...args: Args) => Promise<unknown>) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  async function run(...args: Args): Promise<boolean> {
    clearTimeout(timer.current);
    setPending(true);
    setDone(false);
    setError(undefined);
    try {
      await action(...args);
      setDone(true);
      timer.current = setTimeout(() => {
        setDone(false);
      }, DONE_MS);
      return true;
    } catch (failure) {
      setError(errorMessage(failure));
      return false;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, done, error };
}
