import { Hono } from 'hono';
import type { Env } from '../shared/types';
import { createSession, deleteSession } from '../auth/sessionManager';
import { upsertUser } from '../db/queries';
import { authMiddleware } from '../auth/middleware';

type Variables = { userId: string };

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================
// POST /auth/dev  — no-auth sign-in for local development
// Creates a user with a random ID and the provided display name.
// ============================================================

auth.post('/dev', async (ctx) => {
  let body: { displayName?: string };
  try {
    body = await ctx.req.json();
  } catch {
    body = {};
  }

  const displayName = (body.displayName ?? '').trim();
  if (!displayName) {
    return ctx.json({ error: 'displayName is required' }, 400);
  }

  // Stable dev ID based on name so the same name always gets the same account
  const devId = `dev_${displayName.toLowerCase().replace(/\s+/g, '_')}`;
  const user = await upsertUser(ctx.env.DB, devId, displayName);
  const sessionToken = await createSession(ctx.env.SESSIONS, user.id);

  return ctx.json({
    sessionToken,
    userId: user.id,
    displayName: user.display_name,
    accountId: user.account_id,
  });
});

// ============================================================
// DELETE /auth/session  (logout)
// ============================================================

auth.delete('/session', authMiddleware, async (ctx) => {
  const authHeader = ctx.req.header('Authorization') ?? '';
  const token = authHeader.slice(7).trim();
  await deleteSession(ctx.env.SESSIONS, token);
  return ctx.json({ ok: true });
});

export default auth;
