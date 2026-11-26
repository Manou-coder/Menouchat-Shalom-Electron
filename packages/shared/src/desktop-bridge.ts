import { z } from 'zod';

/** Command-line switch the main process uses to hand the bridge to the preload script. */
export const DESKTOP_BRIDGE_SWITCH = 'menouchat-bridge';

/** Name of the global the preload script exposes to local Electron windows. */
export const DESKTOP_BRIDGE_GLOBAL = 'menouchatDesktop';

/**
 * Everything a local Electron window receives from the preload script: the server to talk
 * to and the per-launch token that identifies it as a local client. Nothing else crosses
 * the preload boundary; business logic goes through the HTTP API.
 */
export const desktopBridgeSchema = z
  .object({
    baseUrl: z.url({ protocol: /^https?$/ }),
    token: z.string().min(32),
  })
  .readonly();

export type DesktopBridge = z.infer<typeof desktopBridgeSchema>;

/** Serialises the bridge into the value of the `--menouchat-bridge` command-line switch. */
export function encodeDesktopBridge(bridge: DesktopBridge): string {
  return encodeURIComponent(JSON.stringify(bridge));
}

/** Reads the bridge back from the preload's `process.argv`, validating it. */
export function decodeDesktopBridge(argv: readonly string[]): DesktopBridge {
  const prefix = `--${DESKTOP_BRIDGE_SWITCH}=`;
  const argument = argv.find((value) => value.startsWith(prefix));
  if (argument === undefined) {
    throw new Error(`Missing --${DESKTOP_BRIDGE_SWITCH} switch`);
  }
  const decoded: unknown = JSON.parse(decodeURIComponent(argument.slice(prefix.length)));
  return desktopBridgeSchema.parse(decoded);
}
