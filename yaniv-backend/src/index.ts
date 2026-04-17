import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './shared/types';
import authRoutes from './routes/authRoutes';
import lobbyRoutes from './routes/lobbyRoutes';
import gameRoutes from './routes/gameRoutes';

// Re-export the Durable Object class so Wrangler can find it
export { GameTable } from './durable-objects/GameTable';

// ============================================================
// Worker entry point
// ============================================================

const app = new Hono<{ Bindings: Env }>();

const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function getAllowedOrigins(env: Env): Set<string> {
  const configuredOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return new Set(configuredOrigins);
  }

  if (env.ENVIRONMENT === 'production') {
    return new Set();
  }

  return new Set(DEFAULT_DEV_ORIGINS);
}

// CORS — only allow explicitly configured origins
app.use(
  '*',
  cors({
    origin: (origin, ctx) => {
      if (!origin) return null;

      const allowedOrigins = getAllowedOrigins(ctx.env);
      return allowedOrigins.has(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Rate limiter (lightweight; for heavy traffic use CF Rate Limiting rules in wrangler.toml)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
app.use('*', async (ctx, next) => {
  const ip = ctx.req.header('CF-Connecting-IP') ?? 'unknown';
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit = 60;

  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + window });
  } else {
    entry.count++;
    if (entry.count > limit) {
      return ctx.json({ error: 'Rate limit exceeded' }, 429);
    }
  }

  await next();
});

// Routes
app.route('/auth', authRoutes);
app.route('/tables', lobbyRoutes);
app.route('/game', gameRoutes);

// Health check
app.get('/health', (ctx) => ctx.json({ ok: true, ts: Date.now() }));

// 404 fallback
app.notFound((ctx) => ctx.json({ error: 'Not found' }, 404));

export default app;
