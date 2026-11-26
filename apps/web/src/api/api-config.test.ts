import { describe, expect, it } from 'vitest';

import { resolveApiConfig } from './api-config.ts';

const token = 'b'.repeat(43);

describe('resolveApiConfig', () => {
  it('uses the desktop bridge when the preload provided one', () => {
    expect(
      resolveApiConfig({ baseUrl: 'http://127.0.0.1:3741', token }, 'http://127.0.0.1:5173'),
    ).toEqual({ url: 'http://127.0.0.1:3741/trpc', token });
  });

  it('falls back to the page origin without a token in a plain browser', () => {
    expect(resolveApiConfig(undefined, 'http://192.168.1.20:3741')).toEqual({
      url: 'http://192.168.1.20:3741/trpc',
    });
  });

  it('ignores a malformed bridge rather than trusting it', () => {
    expect(resolveApiConfig({ baseUrl: 'javascript:alert(1)', token }, 'http://localhost')).toEqual(
      { url: 'http://localhost/trpc' },
    );
  });
});
