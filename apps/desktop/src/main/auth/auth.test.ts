import { describe, expect, it } from 'vitest';

import { hashPin, verifyPin } from './pin-hash.ts';
import { createLoginThrottle, createSessionStore } from './sessions.ts';

describe('PIN hashing', () => {
  it('verifies the right PIN only, with a fresh salt each time', async () => {
    const hash = await hashPin('2580');
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(hash).not.toContain('2580');
    await expect(verifyPin('2580', hash)).resolves.toBe(true);
    await expect(verifyPin('2581', hash)).resolves.toBe(false);
    expect(await hashPin('2580')).not.toBe(hash);
  });

  it('rejects malformed stored hashes', async () => {
    await expect(verifyPin('2580', 'plain-text')).resolves.toBe(false);
  });
});

describe('sessions', () => {
  it('expires after thirty days and can be revoked', () => {
    let time = 0;
    const sessions = createSessionStore(() => time);
    const id = sessions.create();
    expect(sessions.isValid(id)).toBe(true);
    expect(sessions.isValid('forged')).toBe(false);
    time += 31 * 24 * 3_600_000;
    expect(sessions.isValid(id)).toBe(false);

    const other = sessions.create();
    sessions.revokeAll();
    expect(sessions.isValid(other)).toBe(false);
  });
});

describe('login throttle', () => {
  it('locks a device out for fifteen minutes after five wrong PINs', () => {
    let time = 0;
    const throttle = createLoginThrottle(() => time);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(throttle.retryAfter('192.168.1.20')).toBe(0);
      throttle.recordFailure('192.168.1.20');
      time += 1_000;
    }
    expect(throttle.retryAfter('192.168.1.20')).toBe(15 * 60_000 - 5_000);
    expect(throttle.retryAfter('192.168.1.21')).toBe(0);
    time += 15 * 60_000;
    expect(throttle.retryAfter('192.168.1.20')).toBe(0);
  });

  it('forgets failures after a successful login', () => {
    const throttle = createLoginThrottle(() => 0);
    for (let attempt = 0; attempt < 5; attempt++) throttle.recordFailure('a');
    throttle.recordSuccess('a');
    expect(throttle.retryAfter('a')).toBe(0);
  });
});
