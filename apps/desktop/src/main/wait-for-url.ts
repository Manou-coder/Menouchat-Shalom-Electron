const RETRY_DELAY_MS = 250;

/**
 * Resolves once `url` answers. In development the Electron shell and the Vite dev server
 * start in parallel, so the window must not load before Vite is listening.
 */
export async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await fetch(url, { method: 'HEAD' });
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw new Error(`${url} did not respond within ${String(timeoutMs)} ms`, { cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}
