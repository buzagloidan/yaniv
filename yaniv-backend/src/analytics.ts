// ============================================================
// Cloudflare Analytics Engine helpers
// Each event uses:
//   indexes[0]  — event name (for SQL WHERE filtering)
//   blobs       — string properties
//   doubles     — numeric properties
// ============================================================

import type { Env } from './shared/types';

type Props = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(env: Env, event: string, props: Props = {}): void {
  if (!env.ANALYTICS) return;

  const blobs: string[] = [];
  const doubles: number[] = [];

  for (const [, v] of Object.entries(props)) {
    if (typeof v === 'number') {
      doubles.push(v);
    } else {
      blobs.push(v == null ? '' : String(v));
    }
  }

  // Also store the full payload as a JSON blob for ad-hoc queries
  blobs.push(JSON.stringify(props));

  try {
    env.ANALYTICS.writeDataPoint({
      indexes: [event],
      blobs,
      doubles,
    });
  } catch (err) {
    // Never let analytics errors affect game logic
    console.error('[analytics] writeDataPoint failed:', err);
  }
}
