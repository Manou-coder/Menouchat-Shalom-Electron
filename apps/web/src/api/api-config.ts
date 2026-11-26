import { desktopBridgeSchema, TRPC_PATH } from '@menouchat/shared';

export interface ApiConfig {
  url: string;
  /** Present only in the desktop app's own windows, which receive it from the preload. */
  token?: string;
}

/**
 * Electron windows talk to the server the preload names, with its launch token; any other
 * browser (a phone on the local Wi-Fi) talks to the origin that served the page.
 */
export function resolveApiConfig(bridge: unknown, pageOrigin: string): ApiConfig {
  const parsed = desktopBridgeSchema.safeParse(bridge);
  if (!parsed.success) {
    return { url: new URL(TRPC_PATH, pageOrigin).href };
  }
  return { url: new URL(TRPC_PATH, parsed.data.baseUrl).href, token: parsed.data.token };
}
