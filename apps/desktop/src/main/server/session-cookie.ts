export const SESSION_COOKIE = 'menouchat_session';
const MAX_AGE_SECONDS = 30 * 24 * 3_600;

export function readSessionCookie(header: string | undefined): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) {
      return value.join('=');
    }
  }
  return undefined;
}

/** HttpOnly and SameSite=Strict: scripts cannot read it and other sites cannot send it. */
export function sessionCookieHeader(sessionId: string | null): string {
  return sessionId === null
    ? `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
    : `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${String(MAX_AGE_SECONDS)}`;
}
