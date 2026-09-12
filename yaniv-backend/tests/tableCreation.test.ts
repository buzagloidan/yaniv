import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import app from '../src/index';
import { createTable } from '../src/db/queries';
import type { Env } from '../src/shared/types';

const settings = { maxPlayers: 4, yanivThreshold: 7, turnTimeoutSeconds: 30, isRanked: false };
let mf: Miniflare;
let db: D1Database;

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    d1Databases: ['DB'],
  });
  db = await mf.getD1Database('DB') as unknown as D1Database;
  const schema = readFileSync(new NodeURL('../src/db/schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.replace(/--[^\n]*/g, '').split(';').filter((sql) => sql.trim())) {
    await db.prepare(statement).run();
  }
  await db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').bind('host', 1, 'Host', 0, 0).run();
});

beforeEach(async () => {
  await db.prepare('DELETE FROM table_players').run();
  await db.prepare('DELETE FROM tables').run();
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await mf?.dispose(); });

async function seedTable(code: string, status: string) {
  await db.prepare('INSERT INTO tables (id, room_code, host_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(`old-${code}`, code, 'host', status, 0).run();
}

describe('table room-code allocation against D1', () => {
  it.each(['finished', 'cancelled', 'waiting', 'in_progress'])('skips codes belonging to %s tables', async (status) => {
    await seedTable('1000', status);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(await createTable(db, 'new', 'host', settings)).toBe('1001');
    expect(await db.prepare('SELECT status FROM tables WHERE id = ?').bind('old-1000').first('status')).toBe(status);
  });

  it('atomically reserves distinct codes for concurrent requests with the same random start', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const codes = await Promise.all(Array.from({ length: 8 }, (_, i) => createTable(db, `new-${i}`, 'host', settings)));
    expect(new Set(codes).size).toBe(8);
    expect(codes.every((code) => code !== null)).toBe(true);
  });

  it('wraps from 9999 to 1000', async () => {
    await seedTable('9999', 'finished');
    vi.spyOn(Math, 'random').mockReturnValue(0.99999);
    expect(await createTable(db, 'new', 'host', settings)).toBe('1000');
  });

  it('finds the last free code and returns null only when every code is occupied', async () => {
    await db.prepare(`WITH RECURSIVE codes(code) AS (
      SELECT 1000 UNION ALL SELECT code + 1 FROM codes WHERE code < 9998
    ) INSERT INTO tables (id, room_code, host_id, status, created_at)
      SELECT 'old-' || code, CAST(code AS TEXT), 'host', 'finished', 0 FROM codes`).run();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(await createTable(db, 'last', 'host', settings)).toBe('9999');
    expect(await createTable(db, 'full', 'host', settings)).toBeNull();
    expect(await db.prepare('SELECT id FROM tables WHERE id = ?').bind('full').first()).toBeNull();
  });

  it('does not suppress unrelated database constraints', async () => {
    await expect(createTable(db, 'new', 'missing-host', settings)).rejects.toThrow(/FOREIGN KEY/);
  });
});

describe('POST /tables', () => {
  function envWithStub() {
    const stubFetch = vi.fn(async () => new Response('{"ok":true}'));
    return {
      stubFetch,
      env: {
        DB: db,
        SESSIONS: {
          get: async () => JSON.stringify({ userId: 'host', expiresAt: Date.now() + 60_000 }),
          put: async () => {},
        },
        GAME_TABLE: { idFromName: (id: string) => id, get: () => ({ fetch: stubFetch }) },
        ALLOWED_ORIGINS: 'http://example.com',
      } as unknown as Env,
    };
  }
  const request = {
    method: 'POST',
    headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxPlayers: 4, yanivThreshold: 7, scoreLimit: 100, isPrivateTable: true }),
  };

  it('creates and initializes a table when the random code belongs to a finished game', async () => {
    await seedTable('1000', 'finished');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { env, stubFetch } = envWithStub();
    const response = await app.request('http://example.com/tables', request, env);
    expect(response.status).toBe(201);
    const body = await response.json() as { tableId: string; roomCode: string };
    expect(body.roomCode).toBe('1001');
    expect(stubFetch).toHaveBeenCalledOnce();
    expect(await db.prepare('SELECT user_id FROM table_players WHERE table_id = ?').bind(body.tableId).first('user_id')).toBe('host');
  });

  it('returns an actionable 503 without initializing a game when codes are exhausted', async () => {
    await db.prepare(`WITH RECURSIVE codes(code) AS (
      SELECT 1000 UNION ALL SELECT code + 1 FROM codes WHERE code < 9999
    ) INSERT INTO tables (id, room_code, host_id, status, created_at)
      SELECT 'old-' || code, CAST(code AS TEXT), 'host', 'finished', 0 FROM codes`).run();
    const { env, stubFetch } = envWithStub();
    const response = await app.request('http://example.com/tables', request, env);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'No room codes available. Please try again later.' });
    expect(stubFetch).not.toHaveBeenCalled();
  });
});
