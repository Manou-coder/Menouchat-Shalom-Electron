export {
  decodeDesktopBridge,
  DESKTOP_BRIDGE_GLOBAL,
  DESKTOP_BRIDGE_SWITCH,
  desktopBridgeSchema,
  encodeDesktopBridge,
  type DesktopBridge,
} from './desktop-bridge.ts';
export {
  displayStateSchema,
  SLIDES_PATH,
  slidePageUrl,
  zmanSchema,
  type DisplayState,
  type ZmanSnapshot,
} from './display-state.ts';
export { clientKindSchema, healthSchema, type ClientKind, type Health } from './health.ts';
export { DEFAULT_HTTP_PORT, TRPC_PATH, WEB_DEV_SERVER_PORT } from './network.ts';
export { strings } from './strings.ts';
export * from './persisted/index.ts';
