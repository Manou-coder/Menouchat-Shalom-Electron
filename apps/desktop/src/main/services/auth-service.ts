import type { AuthApi } from '../api/router.ts';
import type { LoginThrottle, SessionStore } from '../auth/sessions.ts';

export interface AuthServiceDependencies {
  sessions: SessionStore;
  throttle: LoginThrottle;
  verifyPin: (pin: string) => Promise<boolean>;
  isPinSet: () => Promise<boolean>;
}

export function createAuthService(dependencies: AuthServiceDependencies): AuthApi {
  const { sessions, throttle } = dependencies;
  return {
    async login(pin, remoteAddress) {
      const retryAfterMs = throttle.retryAfter(remoteAddress);
      if (retryAfterMs > 0) {
        return { ok: false, retryAfterMs };
      }
      if (!(await dependencies.verifyPin(pin))) {
        throttle.recordFailure(remoteAddress);
        return { ok: false, retryAfterMs: 0 };
      }
      throttle.recordSuccess(remoteAddress);
      return { ok: true, sessionId: sessions.create() };
    },
    isSessionValid: (sessionId) => sessions.isValid(sessionId),
    logout: (sessionId) => {
      sessions.revoke(sessionId);
    },
    isPinSet: dependencies.isPinSet,
  };
}
