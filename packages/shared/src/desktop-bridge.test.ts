import { describe, expect, it } from 'vitest';

import {
  decodeDesktopBridge,
  DESKTOP_BRIDGE_SWITCH,
  desktopBridgeSchema,
  encodeDesktopBridge,
} from './desktop-bridge.ts';

const bridge = { baseUrl: 'http://127.0.0.1:3741', token: 'a'.repeat(43) };

describe('desktopBridgeSchema', () => {
  it('accepts an HTTP base URL and a long token', () => {
    expect(desktopBridgeSchema.parse(bridge)).toEqual(bridge);
  });

  it('rejects non-HTTP URLs', () => {
    expect(desktopBridgeSchema.safeParse({ ...bridge, baseUrl: 'file:///C:/app' }).success).toBe(
      false,
    );
  });

  it('rejects short tokens', () => {
    expect(desktopBridgeSchema.safeParse({ ...bridge, token: 'short' }).success).toBe(false);
  });

  it('strips unknown keys so nothing else crosses the preload boundary', () => {
    expect(desktopBridgeSchema.parse({ ...bridge, extra: true })).not.toHaveProperty('extra');
  });
});

describe('desktop bridge command-line switch', () => {
  it('round-trips through process.argv', () => {
    const argv = [
      'electron',
      '--type=renderer',
      `--${DESKTOP_BRIDGE_SWITCH}=${encodeDesktopBridge(bridge)}`,
    ];
    expect(decodeDesktopBridge(argv)).toEqual(bridge);
  });

  it('fails when the switch is missing', () => {
    expect(() => decodeDesktopBridge(['electron'])).toThrow(/Missing --menouchat-bridge/);
  });

  it('fails when the switch holds an invalid bridge', () => {
    const argv = [`--${DESKTOP_BRIDGE_SWITCH}=${encodeURIComponent('{"token":"x"}')}`];
    expect(() => decodeDesktopBridge(argv)).toThrow();
  });
});
