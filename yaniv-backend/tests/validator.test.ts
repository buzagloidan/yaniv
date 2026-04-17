import { describe, expect, it } from 'vitest';
import type { GameSettings, GameState } from '../src/shared/types';
import { validateDiscard, validateDraw, validateYanivCall } from '../src/durable-objects/validator';
import { ErrorCode } from '../src/shared/errors';

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
        hand: ['5H', '5D', '2S'],
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
    deck: ['9H', '10H'],
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

describe('validator current turn guards', () => {
  it('rejects discard when currentTurnIndex points outside seatOrder', () => {
    const result = validateDiscard('p1', ['5H'], makeState({ currentTurnIndex: 99 }));

    expect(result).toEqual({ valid: false, code: ErrorCode.INVALID_MESSAGE });
  });

  it('rejects draw when currentTurnIndex points to a missing player record', () => {
    const state = makeState({
      phase: 'player_turn_draw',
      seatOrder: ['ghost'],
      currentTurnIndex: 0,
    });
    const result = validateDraw('p1', 'deck', state);

    expect(result).toEqual({ valid: false, code: ErrorCode.INVALID_MESSAGE });
  });

  it('still allows a valid yaniv call on the active turn', () => {
    const state = makeState({
      players: {
        p1: {
          ...makeState().players.p1,
          hand: ['2H', '2D', '3S'],
        },
        p2: makeState().players.p2,
      },
    });

    expect(validateYanivCall('p1', state)).toEqual({ valid: true });
  });

  it('rejects K-Q-A as a valid run', () => {
    const state = makeState({
      players: {
        p1: {
          ...makeState().players.p1,
          hand: ['KH', 'QH', 'AH'],
        },
        p2: makeState().players.p2,
      },
    });

    expect(validateDiscard('p1', ['KH', 'QH', 'AH'], state)).toEqual({
      valid: false,
      code: ErrorCode.INVALID_MOVE,
    });
  });
});
