import type { CardId, DiscardPileState, GameSettings } from '../shared/types';

// ============================================================
// Deck construction
// ============================================================

const SUITS = ['S', 'H', 'D', 'C'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export function createDeck(): CardId[] {
  const deck: CardId[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  deck.push('JK1', 'JK2');
  return deck; // 54 cards
}

export function shuffleDeck(deck: CardId[]): CardId[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ============================================================
// Card parsing & values
// ============================================================

export function isJoker(cardId: CardId): boolean {
  return cardId === 'JK1' || cardId === 'JK2';
}

interface ParsedCard {
  rank: string;
  suit: string;
}

export function parseCard(cardId: CardId): ParsedCard {
  if (isJoker(cardId)) return { rank: 'joker', suit: 'joker' };
  // '10x' is 3 chars; everything else is 2
  if (cardId.startsWith('10')) return { rank: '10', suit: cardId[2] };
  return { rank: cardId[0], suit: cardId[1] };
}

/**
 * Rank order for run sequencing: A=1, 2-10=face, J=11, Q=12, K=13.
 * Jokers return 0 (not used in ordering).
 */
export function rankOrder(rank: string): number {
  const table: Record<string, number> = {
    A: 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    J: 11, Q: 12, K: 13,
  };
  return table[rank] ?? 0;
}

/**
 * Point value for scoring: J/Q/K=10, A=1, Joker=0.
 */
export function cardPointValue(cardId: CardId): number {
  if (isJoker(cardId)) return 0;
  const { rank } = parseCard(cardId);
  if (rank === 'A') return 1;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

export function handTotal(hand: CardId[]): number {
  return hand.reduce((sum, c) => sum + cardPointValue(c), 0);
}

// ============================================================
// Discard validation
// ============================================================

/**
 * 2-4 cards of the same rank (jokers act as wild rank-matcher).
 * At least 1 non-joker required to anchor the rank.
 */
function isValidSameRankSet(cards: CardId[]): boolean {
  if (cards.length < 2 || cards.length > 4) return false;
  const nonJokers = cards.filter((c) => !isJoker(c));
  if (nonJokers.length === 0) return false;
  const baseRank = parseCard(nonJokers[0]).rank;
  return nonJokers.every((c) => parseCard(c).rank === baseRank);
}

/**
 * 3+ cards forming a consecutive run in the same suit.
 * Jokers are fully wild: they can fill any position including start and end.
 * At least 1 non-joker is required to determine the suit.
 *
 * Algorithm:
 *  1. All non-jokers must share the same suit.
 *  2. No duplicate ranks among non-jokers.
 *  3. Count gaps between non-joker ranks; jokers must cover them.
 *  4. Remaining jokers extend the run at the edges, bounded by A(1)..K(13).
 */
function isValidRun(cards: CardId[]): boolean {
  if (cards.length < 3) return false;

  const jokerCount = cards.filter((c) => isJoker(c)).length;
  const nonJokers = cards.filter((c) => !isJoker(c));

  if (nonJokers.length === 0) return false;

  const suit = parseCard(nonJokers[0]).suit;
  if (!nonJokers.every((c) => parseCard(c).suit === suit)) return false;

  const ranks = nonJokers.map((c) => rankOrder(parseCard(c).rank));
  if (new Set(ranks).size !== nonJokers.length) return false; // duplicate ranks

  const sorted = [...ranks].sort((a, b) => a - b);
  const minRank = sorted[0];
  const maxRank = sorted[sorted.length - 1];
  const k = nonJokers.length;

  // Gaps within the non-joker span that jokers must fill
  const internalGaps = maxRank - minRank + 1 - k;
  if (internalGaps < 0) return false; // shouldn't occur after duplicate check
  if (internalGaps > jokerCount) return false;

  // Jokers available to extend at edges
  const extensionJokers = jokerCount - internalGaps;
  const leftSpace = minRank - 1;    // ranks available below min (toward A)
  const rightSpace = 13 - maxRank;  // ranks available above max (toward K)
  if (extensionJokers > leftSpace + rightSpace) return false;

  return true;
}

export function isValidDiscard(cards: CardId[]): boolean {
  if (cards.length === 0) return false;
  if (cards.length === 1) return true;
  if (cards.length <= 4 && isValidSameRankSet(cards)) return true;
  if (cards.length >= 3 && isValidRun(cards)) return true;
  return false;
}

/**
 * Sort a valid discard set into canonical order for storage and display.
 *
 * - Single card: unchanged.
 * - Same-rank set: non-jokers first (by suit), jokers appended at the end.
 * - Run: non-jokers sorted ascending by rank; jokers placed into internal
 *   rank gaps first (left-to-right), then any remaining extension jokers
 *   appended at the right edge.
 *
 * This guarantees that jokers which fill a gap in a run are never at
 * index 0 or the last index, so players cannot draw them from the pile.
 */
export function sortDiscardSet(cards: CardId[]): CardId[] {
  if (cards.length <= 1) return cards;

  const jokers = cards.filter((c) => isJoker(c));
  const nonJokers = cards.filter((c) => !isJoker(c));

  if (nonJokers.length === 0) return cards;

  // Detect same-rank set
  const firstRank = parseCard(nonJokers[0]).rank;
  const isSameRank = nonJokers.every((c) => parseCard(c).rank === firstRank);

  if (isSameRank) {
    // Consistent suit order; jokers at the end (all positions equivalent)
    const suitOrder: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
    return [
      ...nonJokers.sort(
        (a, b) =>
          (suitOrder[parseCard(a).suit] ?? 4) - (suitOrder[parseCard(b).suit] ?? 4),
      ),
      ...jokers,
    ];
  }

  // Run: sort non-jokers ascending, then weave jokers into internal gaps
  const sortedNonJokers = [...nonJokers].sort(
    (a, b) => rankOrder(parseCard(a).rank) - rankOrder(parseCard(b).rank),
  );

  const result: CardId[] = [];
  const jokerPool = [...jokers];

  for (let i = 0; i < sortedNonJokers.length; i++) {
    if (i > 0) {
      const prevRank = rankOrder(parseCard(sortedNonJokers[i - 1]).rank);
      const currRank = rankOrder(parseCard(sortedNonJokers[i]).rank);
      // Fill every missing rank in the gap with a joker
      for (let gap = prevRank + 1; gap < currRank; gap++) {
        if (jokerPool.length > 0) result.push(jokerPool.shift()!);
      }
    }
    result.push(sortedNonJokers[i]);
  }

  // Remaining jokers extend the run at the right edge
  result.push(...jokerPool);

  return result;
}

// ============================================================
// Dealing
// ============================================================

export function dealHands(
  deck: CardId[],
  playerCount: number,
  cardsPerPlayer: number,
): { hands: CardId[][]; remainingDeck: CardId[] } {
  const remaining = [...deck];
  const hands: CardId[][] = Array.from({ length: playerCount }, () => []);
  // Deal round-robin (standard card dealing order)
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < playerCount; p++) {
      const card = remaining.shift();
      if (!card) throw new Error('Deck exhausted during deal');
      hands[p].push(card);
    }
  }
  return { hands, remainingDeck: remaining };
}

// ============================================================
// Deck reshuffle (when draw pile is exhausted)
// ============================================================

export function reshuffleDiscardIntoDeck(pile: DiscardPileState, currentDeck: CardId[]): {
  newDeck: CardId[];
  newPile: DiscardPileState;
} {
  // Keep the current top set drawable; recycle all previous sets + current draw pile
  const cardsToReshuffle = [...currentDeck, ...pile.previousSets.flat()];
  return {
    newDeck: shuffleDeck(cardsToReshuffle),
    newPile: { currentSet: pile.currentSet, previousSets: [] },
  };
}

// ============================================================
// Yaniv / Assaf resolution
// ============================================================

export interface YanivResolution {
  isAssaf: boolean;
  assafPlayerIds: string[];
  scoreDeltas: Record<string, number>;
  newScores: Record<string, number>;
  eliminatedPlayerIds: string[];
  resetPlayerIds: string[];
}

export function resolveYaniv(
  callerId: string,
  hands: Record<string, CardId[]>,
  currentScores: Record<string, number>,
  settings: Pick<GameSettings, 'penaltyOnAssaf' | 'scoreLimit' | 'resetScoreAt'>,
): YanivResolution {
  const callerTotal = handTotal(hands[callerId]);

  // Assaf: any OTHER active player with hand total ≤ caller's total
  const assafPlayerIds = Object.entries(hands)
    .filter(([id]) => id !== callerId)
    .filter(([, hand]) => handTotal(hand) <= callerTotal)
    .map(([id]) => id);

  const isAssaf = assafPlayerIds.length > 0;
  const scoreDeltas: Record<string, number> = {};

  for (const [playerId, hand] of Object.entries(hands)) {
    if (playerId === callerId) {
      scoreDeltas[playerId] = isAssaf ? handTotal(hand) + settings.penaltyOnAssaf : 0;
    } else if (assafPlayerIds.includes(playerId)) {
      // Assaf-ers add nothing
      scoreDeltas[playerId] = 0;
    } else {
      scoreDeltas[playerId] = handTotal(hand);
    }
  }

  const newScores: Record<string, number> = {};
  const eliminatedPlayerIds: string[] = [];
  const resetPlayerIds: string[] = [];

  for (const [playerId, delta] of Object.entries(scoreDeltas)) {
    let score = (currentScores[playerId] ?? 0) + delta;

    // הגעה לסף בדיוק: hitting an exact multiple of resetScoreAt (e.g. 50, 100, 150, 200) drops by one step
    // e.g. 200→150, 150→100, 100→50, 50→0
    if (
      settings.resetScoreAt > 0 &&
      score > 0 &&
      score % settings.resetScoreAt === 0 &&
      score <= settings.scoreLimit
    ) {
      score = score - settings.resetScoreAt;
      resetPlayerIds.push(playerId);
    } else if (score >= settings.scoreLimit) {
      eliminatedPlayerIds.push(playerId);
    }

    newScores[playerId] = score;
  }

  return { isAssaf, assafPlayerIds, scoreDeltas, newScores, eliminatedPlayerIds, resetPlayerIds };
}

// ============================================================
// Auto-discard (turn timeout)
// ============================================================

/**
 * Returns the single card with the highest point value.
 * Ties broken by highest rank order; jokers (0 pts) are last resort.
 */
export function selectAutoDiscardCard(hand: CardId[]): CardId {
  if (hand.length === 0) throw new Error('Cannot auto-discard from empty hand');
  return hand.reduce((best, card) => {
    const bv = cardPointValue(best);
    const cv = cardPointValue(card);
    if (cv > bv) return card;
    if (cv === bv) {
      const br = isJoker(best) ? 0 : rankOrder(parseCard(best).rank);
      const cr = isJoker(card) ? 0 : rankOrder(parseCard(card).rank);
      return cr > br ? card : best;
    }
    return best;
  });
}

// ============================================================
// Bot discard selection
// Tries to find the best valid discard to minimise hand total.
// Priority: sets/runs that remove the most points, else single highest.
// ============================================================

export function selectBotDiscard(hand: CardId[]): CardId[] {
  if (hand.length === 0) return [];

  // Try every possible combination of 2–4 cards for a valid set/run
  let bestCombo: CardId[] = [];
  let bestPtsRemoved = 0;

  const n = hand.length;
  for (let size = Math.min(4, n); size >= 2; size--) {
    // iterate combinations of `size` cards from hand
    const combos = combinations(hand, size);
    for (const combo of combos) {
      if (isValidSameRankSet(combo) || isValidRun(combo)) {
        const pts = combo.reduce((s, c) => s + cardPointValue(c), 0);
        if (pts > bestPtsRemoved) {
          bestPtsRemoved = pts;
          bestCombo = combo;
        }
      }
    }
  }

  if (bestCombo.length > 0) return bestCombo;

  // Fall back to discarding the single highest-value card
  return [selectAutoDiscardCard(hand)];
}

// ============================================================
// הדבקה check — true when the drawn card shares a rank with
// any card in the set that was just discarded.
// Only applies to deck draws (not discard-pile draws).
// ============================================================

export function checkHadabaka(drawnCard: CardId, discardedSet: CardId[]): boolean {
  if (discardedSet.length === 0) return false;

  // Hadabaka is only valid when the discarded set is a same-rank set (singles or pairs/trips/quads).
  // If the non-joker cards in the set have more than one distinct rank, it was a run — no hadabaka.
  const nonJokers = discardedSet.filter((c) => !isJoker(c));
  if (nonJokers.length > 1) {
    const firstRank = parseCard(nonJokers[0]).rank;
    if (!nonJokers.every((c) => parseCard(c).rank === firstRank)) {
      return false; // run discarded — hadabaka not allowed
    }
  }

  const drawnRank = parseCard(drawnCard).rank;
  return discardedSet.some((c) => parseCard(c).rank === drawnRank);
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map(x => [x]);
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      result.push([arr[i], ...rest]);
    }
  }
  return result;
}
