import type { CardId } from '../shared/types';

// ── Parsing ──────────────────────────────────────────────────

export function isJoker(id: CardId): boolean {
  return id === 'JK1' || id === 'JK2';
}

export function parseCard(id: CardId): { rank: string; suit: string } {
  if (isJoker(id)) return { rank: 'joker', suit: 'joker' };
  if (id.startsWith('10')) return { rank: '10', suit: id[2] };
  return { rank: id[0], suit: id[1] };
}

// ── Values ───────────────────────────────────────────────────

export function cardPointValue(id: CardId): number {
  if (isJoker(id)) return 0;
  const { rank } = parseCard(id);
  if (rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

export function handTotal(hand: CardId[]): number {
  return hand.reduce((s, c) => s + cardPointValue(c), 0);
}

// ── Rank ordering for run validation ────────────────────────

function rankOrder(rank: string): number {
  const t: Record<string, number> = {
    A: 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    J: 11, Q: 12, K: 13,
  };
  return t[rank] ?? 0;
}

// ── Discard validation (mirrors backend — client-side UX pre-check only) ─

function isValidSameRankSet(cards: CardId[]): boolean {
  if (cards.length < 2 || cards.length > 4) return false;
  const nonJokers = cards.filter((c) => !isJoker(c));
  if (nonJokers.length === 0) return false;
  const base = parseCard(nonJokers[0]).rank;
  return nonJokers.every((c) => parseCard(c).rank === base);
}

function isValidRun(cards: CardId[]): boolean {
  if (cards.length < 3) return false;
  const jokerCount = cards.filter((c) => isJoker(c)).length;
  const nonJokers = cards.filter((c) => !isJoker(c));
  if (nonJokers.length === 0) return false;
  const suit = parseCard(nonJokers[0]).suit;
  if (!nonJokers.every((c) => parseCard(c).suit === suit)) return false;
  const ranks = nonJokers.map((c) => rankOrder(parseCard(c).rank));
  if (new Set(ranks).size !== nonJokers.length) return false;
  const sorted = [...ranks].sort((a, b) => a - b);
  const min = sorted[0], max = sorted[sorted.length - 1], k = nonJokers.length;
  const internalGaps = max - min + 1 - k;
  if (internalGaps < 0 || internalGaps > jokerCount) return false;
  const ext = jokerCount - internalGaps;
  return ext <= (min - 1) + (13 - max);
}

export function isValidDiscard(cards: CardId[]): boolean {
  if (cards.length === 0) return false;
  if (cards.length === 1) return true;
  if (cards.length <= 4 && isValidSameRankSet(cards)) return true;
  if (cards.length >= 3 && isValidRun(cards)) return true;
  return false;
}

// ── Display helpers ──────────────────────────────────────────

export const SUIT_SYMBOL: Record<string, string> = {
  S: '♠', H: '♥', D: '♦', C: '♣',
};

export const SUIT_COLOR: Record<string, string> = {
  S: '#1f2937', H: '#dc2626', D: '#dc2626', C: '#1f2937',
};

export function cardLabel(id: CardId): string {
  if (isJoker(id)) return '🃏';
  const { rank, suit } = parseCard(id);
  return `${rank}${SUIT_SYMBOL[suit] ?? suit}`;
}
