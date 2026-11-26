import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// OWASP's scrypt baseline (N = 2^17, r = 8, p = 1); a PIN is short, so hashing must be slow.
const PARAMETERS = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const PREFIX = 'scrypt';

function derive(pin: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, KEY_LENGTH, { ...options, maxmem: 256 * 1024 * 1024 }, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key);
      }
    });
  });
}

/** `scrypt$N$r$p$salt$hash`, with salt and hash in base64url: parameters travel with the hash. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(pin, salt, PARAMETERS);
  return [
    PREFIX,
    PARAMETERS.N,
    PARAMETERS.r,
    PARAMETERS.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [prefix, n, r, p, salt, hash] = stored.split('$');
  if (prefix !== PREFIX || salt === undefined || hash === undefined) {
    return false;
  }
  const expected = Buffer.from(hash, 'base64url');
  const key = await derive(pin, Buffer.from(salt, 'base64url'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
