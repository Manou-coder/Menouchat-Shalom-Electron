import { useState } from 'react';

import { errorMessage } from './errors.ts';
import { toast } from './toasts.tsx';

/** Runs a request with a pending flag and toast feedback; never reloads the page (plan §9). */
export function useAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<unknown>,
  successMessage?: string,
) {
  const [pending, setPending] = useState(false);
  async function run(...args: Args): Promise<boolean> {
    setPending(true);
    try {
      await action(...args);
      if (successMessage !== undefined) {
        toast.success(successMessage);
      }
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setPending(false);
    }
  }
  return { run, pending };
}
