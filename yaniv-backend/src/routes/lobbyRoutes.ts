import { Hono } from 'hono';
import type { Env, GameSettings, InitTablePayload, AddPlayerPayload } from '../shared/types';
import { authMiddleware } from '../auth/middleware';
import {
  getActiveTables,
  countActiveTables,
  ensureSystemUser,
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

lobby.get('/', async (ctx) => {
  // Seed public tables up to NUM_PUBLIC_TABLES if needed
  await ensureSystemUser(ctx.env.DB);
  const activeCount = await countActiveTables(ctx.env.DB);
  if (activeCount < DEFAULTS.NUM_PUBLIC_TABLES) {
    const needed = DEFAULTS.NUM_PUBLIC_TABLES - activeCount;
    for (let i = 0; i < needed; i++) {
      try {
        await seedPublicTable(ctx.env);
      } catch {
        // Non-critical — skip if seeding fails
      }
    }
  }

  const tables = await getActiveTables(ctx.env.DB);
  return ctx.json({ tables });
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
    turnTimeoutSeconds?: number;
    isRanked?: boolean;
  };
  try {
    body = await ctx.req.json();
  } catch {
    body = {};
  }

  // Validate + clamp settings
  const maxPlayers = clamp(body.maxPlayers ?? DEFAULTS.MAX_PLAYERS, 2, 5);
  const isRanked = body.isRanked === true;
  const yanivThreshold = isRanked
    ? 7
    : clamp(body.yanivThreshold ?? DEFAULTS.YANIV_THRESHOLD, 5, 9);
  const turnTimeoutSeconds =
    body.turnTimeoutSeconds === DEFAULTS.BLITZ_TURN_TIMEOUT_SECONDS
      ? DEFAULTS.BLITZ_TURN_TIMEOUT_SECONDS
      : DEFAULTS.TURN_TIMEOUT_SECONDS;

  // Generate unique 4-digit room code
  const roomCode = await generateRoomCode(ctx.env.DB);

  const tableId = crypto.randomUUID();
  await createTable(ctx.env.DB, tableId, roomCode, userId, {
    maxPlayers,
    yanivThreshold,
    turnTimeoutSeconds,
    isRanked,
  });

  // Initialise the Durable Object
  const settings: GameSettings = {
    maxPlayers,
    yanivThreshold,
    penaltyOnAssaf: DEFAULTS.PENALTY_ASSAF,
    scoreLimit: DEFAULTS.SCORE_LIMIT,
    resetScoreAt: DEFAULTS.RESET_SCORE_AT,
    turnTimeoutSeconds,
    initialCardCount: DEFAULTS.INITIAL_CARD_COUNT,
    isRanked,
  };

  const initPayload: InitTablePayload = {
    tableId,
    roomCode,
    hostId: userId,
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

  // For waiting tables, check seat capacity
  if (table.status === 'waiting') {
    const playerCount = await getTablePlayerCount(ctx.env.DB, table.id);
    if (playerCount >= table.max_players) return ctx.json({ error: 'Table full' }, 409);
  }
  // in_progress tables: join as waiting player (no seat limit check needed)

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
    const status = doRes.status as 400 | 409 | 500;
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
// POST /tables/:code/add-bot  — add bot players to a waiting table
// ============================================================

lobby.post('/:code/add-bot', async (ctx) => {
  const roomCode = ctx.req.param('code');
  let body: { count?: number } = {};
  try { body = await ctx.req.json(); } catch { /* default count=1 */ }

  const table = await getTableByRoomCode(ctx.env.DB, roomCode);
  if (!table) return ctx.json({ error: 'Table not found' }, 404);
  if (table.status !== 'waiting') return ctx.json({ error: 'Game already started' }, 409);

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

/** Create one public table hosted by the system user. */
async function seedPublicTable(env: Env): Promise<void> {
  const roomCode = await generateRoomCode(env.DB);
  const tableId = crypto.randomUUID();

  const settings: GameSettings = {
    maxPlayers: DEFAULTS.MAX_PLAYERS,
    yanivThreshold: DEFAULTS.YANIV_THRESHOLD,
    penaltyOnAssaf: DEFAULTS.PENALTY_ASSAF,
    scoreLimit: DEFAULTS.SCORE_LIMIT,
    resetScoreAt: DEFAULTS.RESET_SCORE_AT,
    turnTimeoutSeconds: DEFAULTS.TURN_TIMEOUT_SECONDS,
    initialCardCount: DEFAULTS.INITIAL_CARD_COUNT,
    isRanked: false,
  };

  await createTable(env.DB, tableId, roomCode, DEFAULTS.SYSTEM_USER_ID, settings);

  const initPayload: InitTablePayload = {
    tableId,
    roomCode,
    hostId: DEFAULTS.SYSTEM_USER_ID,
    hostDisplayName: 'מערכת',
    hostAccountId: 0,
    isPublicTable: true, // no ghost player added to DO state
    settings,
  };

  const doId = env.GAME_TABLE.idFromName(tableId);
  const stub = env.GAME_TABLE.get(doId);
  await stub.fetch('https://do/internal/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(initPayload),
  });
  // System user is NOT added to table_players — table starts empty
}

export default lobby;
