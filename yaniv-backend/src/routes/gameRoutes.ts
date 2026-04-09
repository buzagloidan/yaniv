import { Hono } from 'hono';
import type { Env } from '../shared/types';
import { authMiddleware } from '../auth/middleware';
import { createWebSocketTicket, consumeWebSocketTicket } from '../auth/sessionManager';
import { getTableById } from '../db/queries';

type Variables = { userId: string };

const game = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================
// POST /game/:tableId/ws-ticket  — short-lived single-use WS ticket
// ============================================================

game.post('/:tableId/ws-ticket', authMiddleware, async (ctx) => {
  const tableId = ctx.req.param('tableId');
  const userId = ctx.var.userId;

  const table = await getTableById(ctx.env.DB, tableId);
  if (!table) {
    return ctx.json({ error: 'Table not found' }, 404);
  }

  const ticket = await createWebSocketTicket(ctx.env.SESSIONS, userId, tableId);
  return ctx.json({ ticket });
});

// ============================================================
// GET /game/:tableId/ws  — WebSocket upgrade
//
// Browser WebSocket APIs cannot attach Authorization headers,
// so clients first exchange their session for a short-lived ticket
// over normal authenticated HTTP, then use ?ticket=... for the upgrade.
// ============================================================

game.get('/:tableId/ws', async (ctx) => {
  const tableId = ctx.req.param('tableId');
  const ticket = ctx.req.query('ticket');

  if (!ticket) {
    return ctx.json({ error: 'Missing ticket' }, 401);
  }

  // Validate and consume the short-lived one-time ticket
  const userId = await consumeWebSocketTicket(ctx.env.SESSIONS, ticket, tableId);
  if (!userId) {
    return ctx.json({ error: 'WebSocket ticket expired or invalid' }, 401);
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
  // Remove the short-lived ticket from the URL forwarded to the DO
  url.searchParams.delete('ticket');

  return stub.fetch(
    new Request(url.toString(), {
      headers: ctx.req.raw.headers,
      method: ctx.req.method,
    }),
  );
});

export default game;
