import { randomBytes } from 'node:crypto';

const SESSION_TTL_MS = 30 * 24 * 3_600_000;
const MAX_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 15 * 60_000;

export interface SessionStore {
  create(): string;
  isValid(sessionId: string | undefined): boolean;
  revoke(sessionId: string | undefined): void;
  /** After a PIN change, every phone must sign in again. */
  revokeAll(): void;
}

/** Admin sessions of phones on the local network. Kept in memory: a restart signs them out. */
export function createSessionStore(now: () => number): SessionStore {
  const sessions = new Map<string, number>();
  return {
    create() {
      const id = randomBytes(32).toString('base64url');
      sessions.set(id, now() + SESSION_TTL_MS);
      return id;
    },
    isValid(sessionId) {
      if (sessionId === undefined) {
        return false;
      }
      const expiresAt = sessions.get(sessionId);
      if (expiresAt === undefined) {
        return false;
      }
      if (expiresAt <= now()) {
        sessions.delete(sessionId);
        return false;
      }
      return true;
    },
    revoke(sessionId) {
      if (sessionId !== undefined) {
        sessions.delete(sessionId);
      }
    },
    revokeAll() {
      sessions.clear();
    },
  };
}

export interface LoginThrottle {
  /** Milliseconds until `address` may try again; 0 when it may try now. */
  retryAfter(address: string): number;
  recordFailure(address: string): void;
  recordSuccess(address: string): void;
}

/** At most five wrong PINs per device every fifteen minutes. */
export function createLoginThrottle(now: () => number): LoginThrottle {
  const failures = new Map<string, number[]>();
  const recent = (address: string) =>
    (failures.get(address) ?? []).filter((time) => time > now() - LOCKOUT_WINDOW_MS);
  return {
    retryAfter(address) {
      const attempts = recent(address);
      const oldest = attempts[0];
      return attempts.length >= MAX_FAILURES && oldest !== undefined
        ? oldest + LOCKOUT_WINDOW_MS - now()
        : 0;
    },
    recordFailure(address) {
      failures.set(address, [...recent(address), now()]);
    },
    recordSuccess(address) {
      failures.delete(address);
    },
  };
}
