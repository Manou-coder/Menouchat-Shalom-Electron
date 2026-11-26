/**
 * Wakes everyone waiting for the data to change: display and admin streams sleep on it
 * between snapshots, and every write calls `notify()`.
 */
export interface ChangeHub {
  notify(): void;
  /** Resolves on the next change, after `timeoutMs`, or when `signal` aborts. */
  wait(timeoutMs: number, signal: AbortSignal): Promise<void>;
}

export function createChangeHub(): ChangeHub {
  const waiters = new Set<() => void>();
  return {
    notify() {
      for (const wake of [...waiters]) {
        wake();
      }
    },
    wait(timeoutMs, signal) {
      return new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          waiters.delete(done);
          signal.removeEventListener('abort', done);
          resolve();
        };
        const timer = setTimeout(done, timeoutMs);
        waiters.add(done);
        signal.addEventListener('abort', done, { once: true });
      });
    },
  };
}
