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

// CORS — restrict to the app's own origin in production
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow requests with no origin (native iOS app)
      if (!origin) return '*';
      // In production, pin to your domain; during dev allow all
      return origin;
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
