import { Hono } from 'hono';
import type { Env } from '../shared/types';
import { getSession } from '../auth/sessionManager';
import { getTableById } from '../db/queries';

type Variables = { userId: string };

const game = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================
// GET /game/:tableId/ws  — WebSocket upgrade
//
// Auth via query param ?token=<sessionToken> because
// browser WebSocket API does not support custom headers.
// Native iOS URLSessionWebSocketTask can pass headers, but
// using a query param keeps both paths compatible.
// ============================================================

game.get('/:tableId/ws', async (ctx) => {
  const tableId = ctx.req.param('tableId');
  const token = ctx.req.query('token');

  if (!token) {
    return ctx.json({ error: 'Missing token' }, 401);
  }

  // Validate session
  const userId = await getSession(ctx.env.SESSIONS, token);
  if (!userId) {
    return ctx.json({ error: 'Session expired or invalid' }, 401);
  }

  // Check table exists in D1
  const table = await getTableById(ctx.env.DB, tableId);
  if (!table) {
    return ctx.json({ error: 'Table not found' }, 404);
  }

  // Route the WebSocket upgrade to the correct Durable Object
  const doId = ctx.env.GAME_TABLE.idFromName(tableId);
  const stub = ctx.env.GAME_TABLE.get(doId);

  // Forward the upgrade request; the DO calls acceptWebSocket internally
  const url = new URL(ctx.req.url);
  url.pathname = '/ws'; // internal DO path is irrelevant; DO inspects Upgrade header
  url.searchParams.set('userId', userId);
  // Remove session token from the URL forwarded to the DO
  url.searchParams.delete('token');

  return stub.fetch(
    new Request(url.toString(), {
      headers: ctx.req.raw.headers,
      method: ctx.req.method,
    }),
  );
});

export default game;
