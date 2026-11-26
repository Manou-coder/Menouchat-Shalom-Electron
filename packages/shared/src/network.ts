/** Port of the embedded HTTP server (API and built web app). */
export const DEFAULT_HTTP_PORT = 3741;

/** Port of the Vite dev server for `apps/web`, which proxies `/trpc` to the HTTP server. */
export const WEB_DEV_SERVER_PORT = 5173;

/** Path prefix of the tRPC API on the HTTP server. */
export const TRPC_PATH = '/trpc';
