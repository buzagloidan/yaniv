import type { GameState, CardId, DrawSource } from '../shared/types';
import { isValidDiscard, handTotal } from './gameLogic';
import { ErrorCode } from '../shared/errors';

export interface ValidationResult {
  valid: true;
}
export interface ValidationError {
  valid: false;
  code: string;
}
export type Validation = ValidationResult | ValidationError;

function ok(): ValidationResult {
  return { valid: true };
}
function err(code: string): ValidationError {
  return { valid: false, code };
}

// ============================================================

export function validateDiscard(
  playerId: string,
  cards: CardId[],
  state: GameState,
): Validation {
  if (state.phase !== 'player_turn_discard') return err(ErrorCode.WRONG_PHASE);

  const currentPlayerId = state.seatOrder[state.currentTurnIndex];
  if (playerId !== currentPlayerId) return err(ErrorCode.NOT_YOUR_TURN);

  const player = state.players[playerId];
  if (!player) return err(ErrorCode.NOT_A_MEMBER);

  if (cards.length === 0) return err(ErrorCode.INVALID_MOVE);

  // Reject duplicate card IDs in the submitted set
  if (new Set(cards).size !== cards.length) return err(ErrorCode.INVALID_MOVE);

  // Every card must be in the player's hand
  const handSet = new Set(player.hand);
  for (const card of cards) {
    if (!handSet.has(card)) return err(ErrorCode.CARDS_NOT_IN_HAND);
  }

  if (!isValidDiscard(cards)) return err(ErrorCode.INVALID_MOVE);

  return ok();
}

export function validateDraw(
  playerId: string,
  source: DrawSource,
  state: GameState,
): Validation {
  if (state.phase !== 'player_turn_draw') return err(ErrorCode.WRONG_PHASE);

  const currentPlayerId = state.seatOrder[state.currentTurnIndex];
  if (playerId !== currentPlayerId) return err(ErrorCode.NOT_YOUR_TURN);

  if (source === 'deck') {
    // Allow even if deck is empty — the DO will reshuffle before drawing
    // Only fail if deck AND reshuffle material are both empty
    const reshufflePool = state.discardPile.previousSets.flat().length + state.deck.length;
    if (reshufflePool === 0) return err(ErrorCode.INVALID_DRAW_SOURCE);
  } else {
    // discard_first or discard_last — draw from what was on top before the player discarded
    const prevSet = state.discardPile.previousSets[state.discardPile.previousSets.length - 1];
    if (!prevSet || prevSet.length === 0) return err(ErrorCode.INVALID_DRAW_SOURCE);
  }

  return ok();
}

export function validateYanivCall(playerId: string, state: GameState): Validation {
  if (state.phase !== 'player_turn_discard') return err(ErrorCode.WRONG_PHASE);

  const currentPlayerId = state.seatOrder[state.currentTurnIndex];
  if (playerId !== currentPlayerId) return err(ErrorCode.NOT_YOUR_TURN);

  const player = state.players[playerId];
  if (!player) return err(ErrorCode.NOT_A_MEMBER);

  if (handTotal(player.hand) > state.settings.yanivThreshold) return err(ErrorCode.HAND_TOO_HIGH);

  return ok();
}
