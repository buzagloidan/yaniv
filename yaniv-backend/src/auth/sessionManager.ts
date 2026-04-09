import { DEFAULTS } from '../shared/constants';

const SESSION_PREFIX = 'session:';
const WS_TICKET_PREFIX = 'ws-ticket:';

interface SessionData {
  userId: string;
  expiresAt: number;
}

interface WebSocketTicketData {
  userId: string;
  tableId: string;
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

export async function createWebSocketTicket(
  kv: KVNamespace,
  userId: string,
  tableId: string,
): Promise<string> {
  const ticket = crypto.randomUUID();
  const expiresAt = Date.now() + DEFAULTS.WS_TICKET_TTL_SECONDS * 1000;

  await kv.put(
    `${WS_TICKET_PREFIX}${ticket}`,
    JSON.stringify({ userId, tableId, expiresAt } satisfies WebSocketTicketData),
    { expirationTtl: DEFAULTS.WS_TICKET_TTL_SECONDS },
  );

  return ticket;
}

export async function consumeWebSocketTicket(
  kv: KVNamespace,
  ticket: string,
  expectedTableId: string,
): Promise<string | null> {
  if (!ticket) return null;

  const key = `${WS_TICKET_PREFIX}${ticket}`;
  const raw = await kv.get(key);
  if (!raw) return null;

  let data: WebSocketTicketData;
  try {
    data = JSON.parse(raw) as WebSocketTicketData;
  } catch {
    await kv.delete(key);
    return null;
  }

  await kv.delete(key);

  if (Date.now() > data.expiresAt) {
    return null;
  }
  if (data.tableId !== expectedTableId) {
    return null;
  }

  return data.userId;
}
