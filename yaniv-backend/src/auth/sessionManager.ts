import { DEFAULTS } from '../shared/constants';

const SESSION_PREFIX = 'session:';

interface SessionData {
  userId: string;
  expiresAt: number;
}

/**
 * Creates a new session token and stores it in KV.
 * Returns the opaque session token (UUID).
 */
export async function createSession(kv: KVNamespace, userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + DEFAULTS.SESSION_TTL_SECONDS * 1000;

  await kv.put(
    `${SESSION_PREFIX}${token}`,
    JSON.stringify({ userId, expiresAt } satisfies SessionData),
    { expirationTtl: DEFAULTS.SESSION_TTL_SECONDS },
  );

  return token;
}

/**
 * Looks up a session token in KV. Returns the userId if valid, null if not found/expired.
 * Slides the TTL on each successful lookup.
 */
export async function getSession(kv: KVNamespace, token: string): Promise<string | null> {
  if (!token) return null;

  const raw = await kv.get(`${SESSION_PREFIX}${token}`);
  if (!raw) return null;

  let data: SessionData;
  try {
    data = JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }

  if (Date.now() > data.expiresAt) {
    await kv.delete(`${SESSION_PREFIX}${token}`);
    return null;
  }

  // Slide TTL
  await kv.put(
    `${SESSION_PREFIX}${token}`,
    JSON.stringify({ ...data, expiresAt: Date.now() + DEFAULTS.SESSION_TTL_SECONDS * 1000 }),
    { expirationTtl: DEFAULTS.SESSION_TTL_SECONDS },
  );

  return data.userId;
}

/**
 * Deletes a session (logout).
 */
export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`${SESSION_PREFIX}${token}`);
}
