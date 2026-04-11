import { describe, expect, it, vi } from 'vitest';
import { GameTable } from '../src/durable-objects/GameTable';
import type { Env, GameSettings, GameState } from '../src/shared/types';

const settings: GameSettings = {
  maxPlayers: 4,
  yanivThreshold: 7,
  penaltyOnAssaf: 30,
  scoreLimit: 200,
  resetScoreAt: 50,
  turnTimeoutSeconds: 15,
  initialCardCount: 5,
  isRanked: false,
};

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    tableId: 'table-1',
    roomCode: '1234',
    hostId: 'p1',
    isPrivateTable: false,
    requiresManualStart: false,
    settings,
    phase: 'player_turn_discard',
    players: {
      p1: {
        userId: 'p1',
        displayName: 'Player 1',
        accountId: 1,
        hand: ['5H', '5D', '9S'],
        score: 0,
        isConnected: true,
        isEliminated: false,
        seatIndex: 0,
        timeoutCount: 0,
        isBot: false,
      },
      p2: {
        userId: 'p2',
        displayName: 'Bot 2',
        accountId: 0,
        hand: ['7C', '8C'],
        score: 0,
        isConnected: true,
        isEliminated: false,
        seatIndex: 1,
        timeoutCount: 0,
        isBot: true,
      },
    },
    seatOrder: ['p1', 'p2'],
    currentTurnIndex: 0,
    deck: ['9H', '10H', 'JS'],
    discardPile: {
      currentSet: ['4C'],
      previousSets: [['AH', 'AD']],
    },
    roundNumber: 1,
    yanivCallerId: null,
    lastRoundCallerId: null,
    turnDeadlineEpoch: Date.now() + 15_000,
    hadabakaCard: null,
    createdAt: Date.now(),
    startedAt: Date.now(),
    waitingPlayers: [],
    pauseState: null,
    ...overrides,
  };
}

function createMockWebSocket(): WebSocket & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    send(data: string) {
      sent.push(data);
    },
    close() {},
  } as unknown as WebSocket & { sent: string[] };
}

function createMockCtx(initialState: GameState | null) {
  let storedState = initialState;
  let alarmAt: number | null = null;

  const storage = {
    get: vi.fn(async () => storedState),
    put: vi.fn(async (_key: string, state: GameState) => {
      storedState = state;
    }),
    deleteAlarm: vi.fn(async () => {
      alarmAt = null;
    }),
    setAlarm: vi.fn(async (ts: number) => {
      alarmAt = ts;
    }),
  };

  const ctx = {
    storage,
    getWebSockets: vi.fn(() => []),
    getTags: vi.fn(() => []),
    acceptWebSocket: vi.fn(),
  } as unknown as DurableObjectState;

  return {
    ctx,
    storage,
    getStoredState: () => storedState,
    getAlarmAt: () => alarmAt,
  };
}

function createMockEnv(options: { failStatusUpdate?: boolean } = {}): Env {
  const db = {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        run: vi.fn(async () => {
          if (options.failStatusUpdate) {
            throw new Error('D1 unavailable');
          }
          return { success: true };
        }),
      })),
    })),
    batch: vi.fn(async () => []),
  } as unknown as D1Database;

  return {
    GAME_TABLE: {} as DurableObjectNamespace,
    DB: db,
    SESSIONS: {} as KVNamespace,
    ANALYTICS: { writeDataPoint: () => {} } as unknown as AnalyticsEngineDataset,
    APPLE_APP_BUNDLE_ID: 'test.bundle',
    ENVIRONMENT: 'test',
  };
}

describe('GameTable pause and reconnect flow', () => {
  it('pauses a bot table when the last human disconnects', async () => {
    const state = makeState();
    const mock = createMockCtx(state);
    const table = new GameTable(mock.ctx, createMockEnv());

    await (table as any).markDisconnected('p1');

    const stored = mock.getStoredState();
    expect(stored?.players.p1.isConnected).toBe(false);
    expect(stored?.pauseState?.reason).toBe('disconnect');
  });

  it('does not pause if a waiting player is already queued for the next game', () => {
    const state = makeState({
      waitingPlayers: [{ userId: 'p3', displayName: 'Player 3', accountId: 3 }],
    });
    const table = new GameTable(createMockCtx(state).ctx, createMockEnv());

    const shouldPause = (table as any).shouldPauseForMissingHumans(state, 'p1');

    expect(shouldPause).toBe(false);
  });

  it('resumes a disconnect-paused game when the human reconnects', async () => {
    const state = makeState({
      players: {
        ...makeState().players,
        p1: {
          ...makeState().players.p1,
          isConnected: false,
        },
      },
      pauseState: {
        reason: 'disconnect',
        pausedByUserId: 'p1',
        pausedAt: Date.now() - 1_000,
        resumeDeadlineEpoch: Date.now() + 29_000,
      },
      turnDeadlineEpoch: null,
    });
    const mock = createMockCtx(state);
    const table = new GameTable(mock.ctx, createMockEnv());
    const ws = createMockWebSocket();

    await (table as any).handleJoin('p1', ws, state);

    const stored = mock.getStoredState();
    expect(stored?.players.p1.isConnected).toBe(true);
    expect(stored?.pauseState).toBeNull();
    expect(mock.storage.setAlarm).toHaveBeenCalled();

    const lastMessage = JSON.parse(ws.sent.at(-1) ?? '{}') as { type?: string; pauseState?: unknown };
    expect(lastMessage.type).toBe('state_snapshot');
    expect(lastMessage.pauseState).toBeNull();
  });

  it('ends a paused bot table when reconnect grace expires', async () => {
    const state = makeState({
      players: {
        ...makeState().players,
        p1: {
          ...makeState().players.p1,
          isConnected: false,
        },
      },
      pauseState: {
        reason: 'disconnect',
        pausedByUserId: 'p1',
        pausedAt: Date.now() - 31_000,
        resumeDeadlineEpoch: Date.now() - 1_000,
      },
      turnDeadlineEpoch: null,
    });
    const mock = createMockCtx(state);
    const table = new GameTable(mock.ctx, createMockEnv());

    await table.alarm();

    const stored = mock.getStoredState();
    expect(stored?.phase).toBe('game_over');
    expect(stored?.pauseState).toBeNull();
    expect(mock.storage.setAlarm).toHaveBeenCalled();
  });
});

describe('GameTable start rollback', () => {
  it('rolls back the DO state if marking the table in progress fails', async () => {
    const state = makeState({
      phase: 'waiting_for_players',
      turnDeadlineEpoch: null,
      players: {
        p1: {
          ...makeState().players.p1,
          isBot: false,
        },
        p2: {
          ...makeState().players.p2,
          displayName: 'Player 2',
          accountId: 2,
          isBot: false,
        },
      },
    });
    const mock = createMockCtx(state);
    const table = new GameTable(mock.ctx, createMockEnv({ failStatusUpdate: true }));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const started = await (table as any).autoStart(state);

      expect(started).toBe(false);
      expect(mock.getStoredState()?.phase).toBe('waiting_for_players');
      expect(mock.getAlarmAt()).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('GameTable match persistence helpers', () => {
  it('builds final persistent results for human players only', () => {
    const state = makeState({
      players: {
        p1: {
          ...makeState().players.p1,
          score: 12,
          isBot: false,
        },
        p2: {
          ...makeState().players.p2,
          userId: 'p2',
          displayName: 'Player 2',
          accountId: 2,
          score: 25,
          isBot: false,
        },
        bot1: {
          ...makeState().players.p2,
          userId: 'bot1',
          displayName: 'Bot',
          isBot: true,
          seatIndex: 2,
          score: 3,
        },
      },
      seatOrder: ['p1', 'p2', 'bot1'],
    });
    const table = new GameTable(createMockCtx(state).ctx, createMockEnv());

    const results = (table as any).buildPersistentPlayerResults(state, 'p1');

    expect(results).toEqual([
      { userId: 'p1', finalScore: 12, placement: 1 },
      { userId: 'p2', finalScore: 25, placement: 3 },
    ]);
  });
});

describe('GameTable action dedupe helpers', () => {
  it('remembers processed action ids per user', () => {
    const table = new GameTable(createMockCtx(makeState()).ctx, createMockEnv());

    expect((table as any).hasProcessedActionId('p1', 'action-1')).toBe(false);

    (table as any).rememberProcessedActionId('p1', 'action-1');

    expect((table as any).hasProcessedActionId('p1', 'action-1')).toBe(true);
    expect((table as any).hasProcessedActionId('p1', 'action-2')).toBe(false);
  });
});

describe('GameTable round flow', () => {
  it('persists match completion after a match-ending Yaniv call', async () => {
    const state = makeState({
      players: {
        p1: {
          ...makeState().players.p1,
          hand: ['2H', '3D'],
          score: 0,
          isBot: false,
        },
        p2: {
          ...makeState().players.p2,
          userId: 'p2',
          displayName: 'Player 2',
          accountId: 2,
          hand: ['10C'],
          score: 199,
          isBot: false,
        },
      },
      seatOrder: ['p1', 'p2'],
      phase: 'player_turn_discard',
    });
    const mock = createMockCtx(state);
    const env = createMockEnv();
    const table = new GameTable(mock.ctx, env);
    const ws = createMockWebSocket();

    await (table as any).handleCallYaniv('p1', ws, state);

    expect(mock.getStoredState()?.phase).toBe('game_over');
    expect((env.DB as unknown as { batch: ReturnType<typeof vi.fn> }).batch).toHaveBeenCalledTimes(2);
    expect(mock.storage.setAlarm).toHaveBeenCalled();
  });
});
