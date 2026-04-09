import { Hono } from 'hono';
import type { Env, GameSettings, InitTablePayload, AddPlayerPayload } from '../shared/types';
import { authMiddleware } from '../auth/middleware';
import {
  getTableByRoomCode,
  getTableById,
  isRoomCodeTaken,
  createTable,
  getTablePlayerCount,
  addTablePlayer,
  removeTablePlayer,
  getUserById,
} from '../db/queries';
import { DEFAULTS } from '../shared/constants';

type Variables = { userId: string };

const lobby = new Hono<{ Bindings: Env; Variables: Variables }>();

lobby.use('*', authMiddleware);

// ============================================================
// GET /tables  — list open tables
// ============================================================

lobby.get('/', async (_ctx) => {
  return _ctx.json({ tables: [] });
});

// ============================================================
// POST /tables  — create a new table
// ============================================================

lobby.post('/', async (ctx) => {
  const userId = ctx.var.userId;
  const user = await getUserById(ctx.env.DB, userId);
  if (!user) return ctx.json({ error: 'User not found' }, 404);

  let body: {
    maxPlayers?: number;
    yanivThreshold?: number;
    scoreLimit?: number;
    isPrivateTable?: boolean;
  };
  try {
    body = await ctx.req.json();
  } catch {
    body = {};
  }

  // Validate + clamp settings
  const maxPlayers = clamp(body.maxPlayers ?? DEFAULTS.MAX_PLAYERS, 2, 4);
  const yanivThreshold = [1, 3, 5, 7].includes(body.yanivThreshold ?? 0)
    ? body.yanivThreshold!
    : DEFAULTS.YANIV_THRESHOLD;
  const scoreLimit = [50, 100, 200].includes(body.scoreLimit ?? 0)
    ? body.scoreLimit!
    : DEFAULTS.SCORE_LIMIT;
  const resetScoreAt = Math.round(scoreLimit / 2);
  const turnTimeoutSeconds = DEFAULTS.TURN_TIMEOUT_SECONDS;
  const isPrivateTable = body.isPrivateTable === true;

  // Generate unique 4-digit room code
  const roomCode = await generateRoomCode(ctx.env.DB);

  const tableId = crypto.randomUUID();
  await createTable(ctx.env.DB, tableId, roomCode, userId, {
    maxPlayers,
    yanivThreshold,
    turnTimeoutSeconds,
    isRanked: false,
  });

  // Initialise the Durable Object
  const settings: GameSettings = {
    maxPlayers,
    yanivThreshold,
    penaltyOnAssaf: DEFAULTS.PENALTY_ASSAF,
    scoreLimit,
    resetScoreAt,
    turnTimeoutSeconds,
    initialCardCount: DEFAULTS.INITIAL_CARD_COUNT,
    isRanked: false,
  };

  const initPayload: InitTablePayload = {
    tableId,
    roomCode,
    hostId: userId,
    isPrivateTable,
    hostDisplayName: user.display_name,
    hostAccountId: user.account_id,
    settings,
  };

  const doId = ctx.env.GAME_TABLE.idFromName(tableId);
  const stub = ctx.env.GAME_TABLE.get(doId);
  const doRes = await stub.fetch('https://do/internal/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(initPayload),
  });

  if (!doRes.ok) {
    return ctx.json({ error: 'Failed to initialise game table' }, 500);
  }

  // Record the host as a table member in D1
  await addTablePlayer(ctx.env.DB, tableId, userId, 0);

  return ctx.json({ tableId, roomCode }, 201);
});

// ============================================================
// POST /tables/:code/join  — join a table by room code
// ============================================================

lobby.post('/:code/join', async (ctx) => {
  const userId = ctx.var.userId;
  const roomCode = ctx.req.param('code');

  const user = await getUserById(ctx.env.DB, userId);
  if (!user) return ctx.json({ error: 'User not found' }, 404);

  const table = await getTableByRoomCode(ctx.env.DB, roomCode);
  if (!table) return ctx.json({ error: 'Table not found' }, 404);
  if (table.status === 'finished' || table.status === 'cancelled') {
    return ctx.json({ error: 'Table has ended' }, 409);
  }

  if (table.status !== 'waiting') {
    return ctx.json({ error: 'Game already started' }, 409);
  }

  // Check seat capacity
  const playerCount = await getTablePlayerCount(ctx.env.DB, table.id);
  if (playerCount >= table.max_players) return ctx.json({ error: 'Table full' }, 409);

  const doId = ctx.env.GAME_TABLE.idFromName(table.id);
  const stub = ctx.env.GAME_TABLE.get(doId);

  const addPayload: AddPlayerPayload = {
    userId,
    displayName: user.display_name,
    accountId: user.account_id,
  };

  const doRes = await stub.fetch('https://do/internal/add-player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addPayload),
  });

  if (!doRes.ok) {
    const errBody = (await doRes.json()) as { error?: string };
    const status = doRes.status as 400 | 404 | 409 | 500;
    return ctx.json({ error: errBody.error ?? 'Failed to join table' }, status);
  }

  const doBody = (await doRes.json()) as {
    seatIndex?: number;
    alreadyJoined?: boolean;
    waiting?: boolean;
  };

  // Record in D1 only for active (non-waiting-queue) players
  if (!doBody.alreadyJoined && !doBody.waiting) {
    await addTablePlayer(ctx.env.DB, table.id, userId, doBody.seatIndex ?? 0);
  }

  return ctx.json({ tableId: table.id, roomCode: table.room_code, waiting: doBody.waiting ?? false });
});

// ============================================================
// POST /tables/:code/leave  — leave a waiting table
// ============================================================

lobby.post('/:code/leave', async (ctx) => {
  const userId = ctx.var.userId;
  const roomCode = ctx.req.param('code');

  const table = await getTableByRoomCode(ctx.env.DB, roomCode);
  if (!table) return ctx.json({ error: 'Table not found' }, 404);
  if (table.status !== 'waiting') return ctx.json({ error: 'Cannot leave after game has started' }, 409);

  const doId = ctx.env.GAME_TABLE.idFromName(table.id);
  const stub = ctx.env.GAME_TABLE.get(doId);
  const doRes = await stub.fetch('https://do/internal/remove-player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!doRes.ok) {
    const err = (await doRes.json()) as { error?: string };
    return ctx.json({ error: err.error ?? 'Failed to leave table' }, doRes.status as 409 | 500);
  }

  await removeTablePlayer(ctx.env.DB, table.id, userId);
  return ctx.json({ ok: true });
});

// ============================================================
// POST /tables/id/:id/leave  — leave a waiting table by id
// ============================================================

lobby.post('/id/:id/leave', async (ctx) => {
  const userId = ctx.var.userId;
  const tableId = ctx.req.param('id');

  const table = await getTableById(ctx.env.DB, tableId);
  if (!table) return ctx.json({ error: 'Table not found' }, 404);
  if (table.status !== 'waiting') return ctx.json({ error: 'Cannot leave after game has started' }, 409);

  const doId = ctx.env.GAME_TABLE.idFromName(table.id);
  const stub = ctx.env.GAME_TABLE.get(doId);
  const doRes = await stub.fetch('https://do/internal/remove-player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!doRes.ok) {
    const err = (await doRes.json()) as { error?: string };
    return ctx.json({ error: err.error ?? 'Failed to leave table' }, doRes.status as 409 | 500);
  }

  await removeTablePlayer(ctx.env.DB, table.id, userId);
  return ctx.json({ ok: true });
});

// ============================================================
// POST /tables/:code/add-bot  — add bot players to a waiting table
// ============================================================

lobby.post('/:code/add-bot', async (ctx) => {
  const userId = ctx.var.userId;
  const roomCode = ctx.req.param('code');
  let body: { count?: number } = {};
  try { body = await ctx.req.json(); } catch { /* default count=1 */ }

  const table = await getTableByRoomCode(ctx.env.DB, roomCode);
  if (!table) return ctx.json({ error: 'Table not found' }, 404);
  if (table.status !== 'waiting') return ctx.json({ error: 'Game already started' }, 409);
  if (table.host_id !== userId) return ctx.json({ error: 'Only the host can add bots' }, 403);

  const humanPlayerCount = await getTablePlayerCount(ctx.env.DB, table.id);
  if (humanPlayerCount > 1) {
    return ctx.json({ error: 'Bots can only be added before other players join' }, 409);
  }

  const doId = ctx.env.GAME_TABLE.idFromName(table.id);
  const stub = ctx.env.GAME_TABLE.get(doId);
  const doRes = await stub.fetch('https://do/internal/add-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: body.count ?? 1 }),
  });

  if (!doRes.ok) {
    const err = (await doRes.json()) as { error?: string };
    return ctx.json({ error: err.error ?? 'Failed to add bot' }, doRes.status as 409 | 500);
  }

  return ctx.json({ ok: true });
});

// ============================================================
// GET /tables/:id  — single table metadata
// ============================================================

lobby.get('/:id', async (ctx) => {
  const tableId = ctx.req.param('id');
  const table = await getTableById(ctx.env.DB, tableId);
  if (!table) return ctx.json({ error: 'Not found' }, 404);
  return ctx.json({ table });
});

// ============================================================
// Helpers
// ============================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

async function generateRoomCode(db: D1Database): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(
      Math.floor(Math.random() * (DEFAULTS.ROOM_CODE_MAX - DEFAULTS.ROOM_CODE_MIN + 1)) +
        DEFAULTS.ROOM_CODE_MIN,
    );
    if (!(await isRoomCodeTaken(db, code))) return code;
  }
  throw new Error('Failed to generate unique room code after 20 attempts');
}


export default lobby;
