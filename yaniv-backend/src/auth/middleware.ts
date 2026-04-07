import type { MiddlewareHandler } from 'hono';
import type { Env } from '../shared/types';
import { getSession } from './sessionManager';

type Variables = { userId: string };

/**
 * Hono middleware that validates the Bearer session token.
 * On success, sets ctx.var.userId for downstream handlers.
 * On failure, returns 401.
 */
export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  ctx,
  next,
) => {
  const authHeader = ctx.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return ctx.json({ error: 'Missing authorization' }, 401);
  }

  const token = authHeader.slice(7).trim();
  const userId = await getSession(ctx.env.SESSIONS, token);

  if (!userId) {
    return ctx.json({ error: 'Session expired or invalid' }, 401);
  }

  ctx.set('userId', userId);
  await next();
};
