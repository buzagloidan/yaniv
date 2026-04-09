import { describe, expect, it, vi } from 'vitest';
import app from '../src/index';
import { createSession } from '../src/auth/sessionManager';
import type { Env } from '../src/shared/types';

class MemoryKV {
  private data = new Map<string, string>();

  async put(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

function createRouteTestEnv() {
  const kv = new MemoryKV();
  const stubFetch = vi.fn(async (request: Request) => new Response(request.url, { status: 200 }));
  const env: Env = {
    GAME_TABLE: {
      idFromName: (name: string) => name as unknown as DurableObjectId,
      get: () =>
        ({
          fetch: stubFetch,
        }) as unknown as DurableObjectStub,
    } as unknown as DurableObjectNamespace,
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql === 'SELECT * FROM tables WHERE id = ?') {
              return {
                id: args[0],
                room_code: '1234',
                host_id: 'p1',
                status: 'waiting',
                max_players: 4,
                yaniv_threshold: 7,
                turn_timeout_seconds: 15,
                is_ranked: 0,
                created_at: Date.now(),
                started_at: null,
                finished_at: null,
                winner_id: null,
              };
            }
            return null;
          },
        }),
      }),
    } as unknown as D1Database,
    SESSIONS: kv as unknown as KVNamespace,
    APPLE_APP_BUNDLE_ID: 'test.bundle',
    ENVIRONMENT: 'test',
  };

  return { env, kv, stubFetch };
}

describe('game routes ticket flow', () => {
  it('issues a ws ticket via auth and consumes it on upgrade', async () => {
    const { env, kv, stubFetch } = createRouteTestEnv();
    const sessionToken = await createSession(kv as unknown as KVNamespace, 'p1');

    const ticketRes = await app.request(
      'http://example.com/game/table-1/ws-ticket',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      },
      env,
    );

    expect(ticketRes.status).toBe(200);
    const { ticket } = (await ticketRes.json()) as { ticket: string };
    expect(ticket).toBeTruthy();

    const wsRes = await app.request(
      `http://example.com/game/table-1/ws?ticket=${encodeURIComponent(ticket)}`,
      {
        method: 'GET',
        headers: {
          Upgrade: 'websocket',
        },
      },
      env,
    );

    expect(wsRes.status).toBe(200);
    expect(stubFetch).toHaveBeenCalledTimes(1);
    const forwarded = stubFetch.mock.calls[0][0] as Request;
    const forwardedUrl = new URL(forwarded.url);
    expect(forwardedUrl.searchParams.get('ticket')).toBeNull();
    expect(forwardedUrl.searchParams.get('userId')).toBe('p1');

    const reusedTicketRes = await app.request(
      `http://example.com/game/table-1/ws?ticket=${encodeURIComponent(ticket)}`,
      {
        method: 'GET',
        headers: {
          Upgrade: 'websocket',
        },
      },
      env,
    );

    expect(reusedTicketRes.status).toBe(401);
  });
});
