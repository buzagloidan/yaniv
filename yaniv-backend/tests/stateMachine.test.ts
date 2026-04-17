import { describe, expect, it } from 'vitest';
import type { GameSettings, GameState } from '../src/shared/types';
import { applyDiscard, applyDraw } from '../src/durable-objects/stateMachine';
import { resolveYaniv } from '../src/durable-objects/gameLogic';

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
        displayName: 'Player 2',
        accountId: 2,
        hand: ['7C', '8C'],
        score: 0,
        isConnected: true,
        isEliminated: false,
        seatIndex: 1,
        timeoutCount: 0,
        isBot: false,
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

describe('state machine guardrails', () => {
  it('caps discard history to the most recent 60 sets', () => {
    const previousSets = Array.from({ length: 60 }, (_, idx) => [`${idx + 1}H`]);
    const state = makeState({
      discardPile: {
        currentSet: ['KC'],
        previousSets,
      },
    });

    const next = applyDiscard(state, 'p1', ['5H', '5D']);

    expect(next.discardPile.previousSets).toHaveLength(60);
    expect(next.discardPile.previousSets[0]).toEqual(['2H']);
    expect(next.discardPile.previousSets.at(-1)).toEqual(['KC']);
  });

  it('keeps the turn with the drawing player during hadabaka', () => {
    const state = makeState({
      phase: 'player_turn_draw',
      discardPile: {
        currentSet: ['4C'],
        previousSets: [['AH']],
      },
      deck: ['4D', '9H'],
    });

    const result = applyDraw(state, 'p1', 'deck');

    expect(result.isHadabaka).toBe(true);
    expect(result.newState.phase).toBe('player_turn_hadabaka');
    expect(result.newState.currentTurnIndex).toBe(0);
    expect(result.newState.hadabakaCard).toBe('4D');
    expect(result.newState.players.p1.hand).toContain('4D');
  });
});

describe('yaniv resolution scoring', () => {
  it('resets exact threshold hits to zero instead of eliminating the player', () => {
    const result = resolveYaniv(
      'p1',
      {
        p1: ['2H', '3D'],
        p2: ['2C', '3C', '5C'],
      },
      {
        p1: 0,
        p2: 40,
      },
      ['p1', 'p2'],
      {
        penaltyOnAssaf: 30,
        scoreLimit: 200,
        resetScoreAt: 50,
      },
    );

    expect(result.isAssaf).toBe(false);
    expect(result.newScores.p2).toBe(0);
    expect(result.resetPlayerIds).toEqual(['p2']);
    expect(result.eliminatedPlayerIds).toEqual([]);
  });

  it('applies the Assaf penalty only to the caller', () => {
    const result = resolveYaniv(
      'p1',
      {
        p1: ['4H'],
        p2: ['4D'],
        p3: ['9S'],
      },
      {
        p1: 0,
        p2: 0,
        p3: 0,
      },
      ['p1', 'p2', 'p3'],
      {
        penaltyOnAssaf: 30,
        scoreLimit: 200,
        resetScoreAt: 50,
      },
    );

    expect(result.isAssaf).toBe(true);
    expect(result.assafPlayerIds).toEqual(['p2']);
    expect(result.scoreDeltas).toEqual({
      p1: 34,
      p2: 0,
      p3: 9,
    });
  });

  it('awards Assaf only to the lowest qualifying opponent', () => {
    const result = resolveYaniv(
      'p1',
      {
        p1: ['7H'],
        p2: ['5D'],
        p3: ['3S'],
      },
      {
        p1: 0,
        p2: 0,
        p3: 0,
      },
      ['p1', 'p2', 'p3'],
      {
        penaltyOnAssaf: 30,
        scoreLimit: 200,
        resetScoreAt: 50,
      },
    );

    expect(result.isAssaf).toBe(true);
    expect(result.assafPlayerIds).toEqual(['p3']);
    expect(result.scoreDeltas).toEqual({
      p1: 37,
      p2: 5,
      p3: 0,
    });
  });

  it('awards Assaf to the later player when the lowest qualifying total is tied', () => {
    const result = resolveYaniv(
      'p1',
      {
        p1: ['7H'],
        p2: ['3D'],
        p3: ['3S'],
        p4: ['5C'],
      },
      {
        p1: 0,
        p2: 0,
        p3: 0,
        p4: 0,
      },
      ['p1', 'p2', 'p3', 'p4'],
      {
        penaltyOnAssaf: 30,
        scoreLimit: 200,
        resetScoreAt: 50,
      },
    );

    expect(result.isAssaf).toBe(true);
    expect(result.assafPlayerIds).toEqual(['p3']);
    expect(result.scoreDeltas).toEqual({
      p1: 37,
      p2: 3,
      p3: 0,
      p4: 5,
    });
  });
});
