import type { GameState, GameSettings, CardId, DrawSource, PlayerRecord } from '../shared/types';
import {
  createDeck,
  shuffleDeck,
  dealHands,
  resolveYaniv,
  reshuffleDiscardIntoDeck,
  selectAutoDiscardCard,
} from './gameLogic';
import { DEFAULTS } from '../shared/constants';

export type YanivResolution = ReturnType<typeof resolveYaniv>;

// ============================================================
// Helpers
// ============================================================

/**
 * Returns the next seat index after `fromIndex`, skipping eliminated players.
 * Wraps around the seat order.
 */
function nextActiveSeat(state: GameState, fromIndex: number): number {
  const n = state.seatOrder.length;
  let idx = (fromIndex + 1) % n;
  for (let guard = 0; guard < n; guard++) {
    if (!state.players[state.seatOrder[idx]]?.isEliminated) return idx;
    idx = (idx + 1) % n;
  }
  return fromIndex; // fallback (only 1 player left — match should have ended)
}

function activePlayers(state: GameState): PlayerRecord[] {
  return state.seatOrder
    .map((id) => state.players[id])
    .filter((p) => p && !p.isEliminated);
}

// ============================================================
// Initialise a new table (before any game starts)
// ============================================================

export function initGameState(
  tableId: string,
  roomCode: string,
  hostId: string,
  host: { userId: string; displayName: string; accountId: number } | null,
  settings: GameSettings,
): GameState {
  const now = Date.now();
  const players = host
    ? {
        [host.userId]: {
          userId: host.userId,
          displayName: host.displayName,
          accountId: host.accountId,
          hand: [],
          score: 0,
          isConnected: false,
          isEliminated: false,
          seatIndex: 0,
          timeoutCount: 0,
          isBot: false,
        },
      }
    : {};
  const seatOrder = host ? [host.userId] : [];
  return {
    tableId,
    roomCode,
    hostId,
    settings,
    phase: 'waiting_for_players',
    players,
    seatOrder,
    currentTurnIndex: 0,
    deck: [],
    discardPile: { currentSet: [], previousSets: [] },
    roundNumber: 0,
    yanivCallerId: null,
    lastRoundCallerId: null,
    turnDeadlineEpoch: null,
    createdAt: now,
    startedAt: null,
    waitingPlayers: [],
  };
}

// ============================================================
// Reset a finished table for a new game
// Merges waitingPlayers into active players, resets all scores/hands.
// connectedUserIds is used to set isConnected accurately.
// ============================================================

export function resetTableState(
  state: GameState,
  connectedUserIds: Set<string>,
): GameState {
  // All participants for the next game: current players + waiting queue
  const allParticipants = [
    ...state.seatOrder.map((uid) => ({
      userId: uid,
      displayName: state.players[uid].displayName,
      accountId: state.players[uid].accountId,
    })),
    ...state.waitingPlayers,
  ];

  const players: Record<string, PlayerRecord> = {};
  const seatOrder: string[] = [];

  allParticipants.forEach((p, idx) => {
    // Skip duplicates (shouldn't happen, but guard)
    if (players[p.userId]) return;
    seatOrder.push(p.userId);
    const wasBot = state.players[p.userId]?.isBot ?? false;
    players[p.userId] = {
      userId: p.userId,
      displayName: p.displayName,
      accountId: p.accountId,
      hand: [],
      score: 0,
      isConnected: wasBot ? true : connectedUserIds.has(p.userId),
      isEliminated: false,
      seatIndex: idx,
      timeoutCount: 0,
      isBot: wasBot,
    };
  });

  return {
    ...state,
    phase: 'waiting_for_players',
    players,
    seatOrder,
    currentTurnIndex: 0,
    deck: [],
    discardPile: { currentSet: [], previousSets: [] },
    roundNumber: 0,
    yanivCallerId: null,
    lastRoundCallerId: null,
    turnDeadlineEpoch: null,
    startedAt: null,
    waitingPlayers: [],
  };
}

// ============================================================
// Add a player to the waiting lobby
// ============================================================

export function addPlayer(
  state: GameState,
  player: { userId: string; displayName: string; accountId: number; isBot?: boolean },
): GameState {
  const seatIndex = state.seatOrder.length;
  return {
    ...state,
    players: {
      ...state.players,
      [player.userId]: {
        userId: player.userId,
        displayName: player.displayName,
        accountId: player.accountId,
        hand: [],
        score: 0,
        isConnected: player.isBot ? true : false, // bots are always "connected"
        isEliminated: false,
        seatIndex,
        timeoutCount: 0,
        isBot: player.isBot ?? false,
      },
    },
    seatOrder: [...state.seatOrder, player.userId],
  };
}

// ============================================================
// Deal (used at game start and between rounds)
// ============================================================

function dealRound(state: GameState, startSeatIndex: number): GameState {
  const active = activePlayers(state);
  const deck = shuffleDeck(createDeck());
  const { hands, remainingDeck } = dealHands(deck, active.length, state.settings.initialCardCount);

  const updatedPlayers = { ...state.players };
  active.forEach((p, i) => {
    updatedPlayers[p.userId] = {
      ...updatedPlayers[p.userId],
      hand: hands[i],
      timeoutCount: 0,
    };
  });

  const now = Date.now();
  return {
    ...state,
    phase: 'player_turn_discard',
    players: updatedPlayers,
    currentTurnIndex: startSeatIndex,
    deck: remainingDeck,
    discardPile: { currentSet: [], previousSets: [] },
    roundNumber: state.roundNumber + 1,
    yanivCallerId: null,
    turnDeadlineEpoch: now + state.settings.turnTimeoutSeconds * 1000,
    startedAt: state.startedAt ?? now,
  };
}

// ============================================================
// Start game (host pressed ready)
// ============================================================

export function startGame(state: GameState): GameState {
  return dealRound(state, 0);
}

// ============================================================
// Start next round (after between_rounds delay)
// ============================================================

export function startNextRound(state: GameState): GameState {
  // The player after last round's Yaniv caller goes first
  const callerId = state.lastRoundCallerId;
  let startSeat = 0;

  if (callerId) {
    const callerIdx = state.seatOrder.indexOf(callerId);
    if (callerIdx !== -1) {
      startSeat = nextActiveSeat(state, callerIdx);
    }
  }

  return dealRound(state, startSeat);
}

// ============================================================
// Discard
// ============================================================

export function applyDiscard(state: GameState, playerId: string, cards: CardId[]): GameState {
  const player = state.players[playerId];
  const cardSet = new Set(cards);
  const newHand = player.hand.filter((c) => !cardSet.has(c));

  // Archive the current top set before replacing it
  const previousSets =
    state.discardPile.currentSet.length > 0
      ? [...state.discardPile.previousSets, state.discardPile.currentSet]
      : state.discardPile.previousSets;

  return {
    ...state,
    phase: 'player_turn_draw',
    players: {
      ...state.players,
      [playerId]: { ...player, hand: newHand },
    },
    discardPile: { currentSet: cards, previousSets },
    turnDeadlineEpoch: Date.now() + state.settings.turnTimeoutSeconds * 1000,
  };
}

// ============================================================
// Draw
// ============================================================

export interface DrawResult {
  newState: GameState;
  drawnCard: CardId;
  deckWasReshuffled: boolean;
}

export function applyDraw(state: GameState, playerId: string, source: DrawSource): DrawResult {
  let deck = [...state.deck];
  let pile = { ...state.discardPile, previousSets: [...state.discardPile.previousSets] };
  let deckWasReshuffled = false;

  let drawnCard: CardId;

  if (source === 'deck') {
    if (deck.length === 0) {
      const reshuffled = reshuffleDiscardIntoDeck(pile, deck);
      deck = reshuffled.newDeck;
      pile = reshuffled.newPile;
      deckWasReshuffled = true;
    }
    drawnCard = deck.shift()!;
  } else if (source === 'discard_first') {
    drawnCard = pile.currentSet[0];
    pile = { ...pile, currentSet: pile.currentSet.slice(1) };
  } else {
    // discard_last
    const lastIdx = pile.currentSet.length - 1;
    drawnCard = pile.currentSet[lastIdx];
    pile = { ...pile, currentSet: pile.currentSet.slice(0, lastIdx) };
  }

  const player = state.players[playerId];
  const nextSeat = nextActiveSeat(state, state.currentTurnIndex);
  const now = Date.now();

  const newState: GameState = {
    ...state,
    phase: 'player_turn_discard',
    players: {
      ...state.players,
      [playerId]: { ...player, hand: [...player.hand, drawnCard] },
    },
    deck,
    discardPile: pile,
    currentTurnIndex: nextSeat,
    turnDeadlineEpoch: now + state.settings.turnTimeoutSeconds * 1000,
  };

  return { newState, drawnCard, deckWasReshuffled };
}

// ============================================================
// Yaniv call
// ============================================================

export function applyYanivCall(state: GameState, callerId: string): GameState {
  return {
    ...state,
    phase: 'yaniv_called',
    yanivCallerId: callerId,
    turnDeadlineEpoch: null,
  };
}

// ============================================================
// Round resolution (called immediately after yaniv_called)
// ============================================================

export interface RoundResolutionResult {
  newState: GameState;
  resolution: YanivResolution;
  isMatchOver: boolean;
  winnerId: string | null;
}

export function applyRoundResolution(state: GameState): RoundResolutionResult {
  const callerId = state.yanivCallerId;
  if (!callerId) throw new Error('applyRoundResolution called without yanivCallerId');

  // Collect active players' hands
  const hands: Record<string, CardId[]> = {};
  const currentScores: Record<string, number> = {};
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.isEliminated) {
      hands[id] = p.hand;
      currentScores[id] = p.score;
    }
  }

  const resolution = resolveYaniv(callerId, hands, currentScores, state.settings);

  // Apply updated scores and eliminations
  const updatedPlayers = { ...state.players };
  for (const [playerId, newScore] of Object.entries(resolution.newScores)) {
    updatedPlayers[playerId] = {
      ...updatedPlayers[playerId],
      score: newScore,
      isEliminated:
        updatedPlayers[playerId].isEliminated ||
        resolution.eliminatedPlayerIds.includes(playerId),
    };
  }

  const remaining = Object.values(updatedPlayers).filter((p) => !p.isEliminated);
  const isMatchOver = remaining.length <= 1;
  const winnerId = isMatchOver ? (remaining[0]?.userId ?? null) : null;

  const newState: GameState = {
    ...state,
    phase: isMatchOver ? 'game_over' : 'between_rounds',
    players: updatedPlayers,
    yanivCallerId: null,
    lastRoundCallerId: callerId,
    turnDeadlineEpoch: null,
  };

  return { newState, resolution, isMatchOver, winnerId };
}

// ============================================================
// Auto-discard on timeout (increments timeoutCount)
// ============================================================

export interface AutoDiscardResult {
  newState: GameState;
  discardedCard: CardId;
  shouldEliminate: boolean;
}

export function applyAutoDiscard(state: GameState, playerId: string): AutoDiscardResult {
  const player = state.players[playerId];
  const discardedCard = selectAutoDiscardCard(player.hand);

  // Remove from hand and update discard pile (same as normal discard)
  const cardSet = new Set([discardedCard]);
  const newHand = player.hand.filter((c) => !cardSet.has(c));
  const previousSets =
    state.discardPile.currentSet.length > 0
      ? [...state.discardPile.previousSets, state.discardPile.currentSet]
      : state.discardPile.previousSets;

  const newTimeoutCount = player.timeoutCount + 1;
  const shouldEliminate = newTimeoutCount >= DEFAULTS.MAX_TIMEOUT_COUNT;

  const newState: GameState = {
    ...state,
    phase: 'player_turn_draw',
    players: {
      ...state.players,
      [playerId]: { ...player, hand: newHand, timeoutCount: newTimeoutCount },
    },
    discardPile: { currentSet: [discardedCard], previousSets },
    turnDeadlineEpoch: Date.now() + state.settings.turnTimeoutSeconds * 1000,
  };

  return { newState, discardedCard, shouldEliminate };
}

// ============================================================
// Eliminate a player mid-round (timeout exceeded)
// ============================================================

export interface EliminationResult {
  newState: GameState;
  isMatchOver: boolean;
  winnerId: string | null;
}

export function eliminatePlayerMidRound(
  state: GameState,
  playerId: string,
): EliminationResult {
  const updatedPlayers = {
    ...state.players,
    [playerId]: { ...state.players[playerId], isEliminated: true, hand: [] },
  };

  const remaining = Object.values(updatedPlayers).filter((p) => !p.isEliminated);
  const isMatchOver = remaining.length <= 1;
  const winnerId = isMatchOver ? (remaining[0]?.userId ?? null) : null;

  const nextSeat = isMatchOver
    ? state.currentTurnIndex
    : nextActiveSeat({ ...state, players: updatedPlayers }, state.currentTurnIndex);

  const now = Date.now();
  const newState: GameState = {
    ...state,
    phase: isMatchOver ? 'game_over' : 'player_turn_discard',
    players: updatedPlayers,
    currentTurnIndex: nextSeat,
    yanivCallerId: null,
    turnDeadlineEpoch: isMatchOver ? null : now + state.settings.turnTimeoutSeconds * 1000,
  };

  return { newState, isMatchOver, winnerId };
}
