import { contextBridge } from 'electron';

import { decodeDesktopBridge, DESKTOP_BRIDGE_GLOBAL } from '@menouchat/shared';

// Only the server URL and the per-launch token cross this boundary; everything else goes
// through the HTTP API, exactly as it does for a phone on the local network.
contextBridge.exposeInMainWorld(DESKTOP_BRIDGE_GLOBAL, decodeDesktopBridge(process.argv));
