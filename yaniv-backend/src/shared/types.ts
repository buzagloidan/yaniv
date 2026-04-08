// ============================================================
// Card types
// ============================================================

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

// Card IDs: "AS", "10H", "KD", "JC", "JK1", "JK2"
export type CardId = string;

export type DrawSource = 'deck' | 'discard_first' | 'discard_last';

// ============================================================
// Game phase
// ============================================================

export type GamePhase =
  | 'waiting_for_players'
  | 'player_turn_discard'
  | 'player_turn_draw'
  | 'player_turn_hadabaka'
  | 'yaniv_called'
  | 'between_rounds'
  | 'game_over'
  | 'abandoned';

// ============================================================
// Game settings
// ============================================================

export interface GameSettings {
  maxPlayers: number;
  yanivThreshold: number;
  penaltyOnAssaf: number;
  scoreLimit: number;
  resetScoreAt: number;
  turnTimeoutSeconds: number;
  initialCardCount: number;
  isRanked: boolean;
}

// ============================================================
// Server-side state (stored in DO, never sent raw to clients)
// ============================================================

export interface PlayerRecord {
  userId: string;
  displayName: string;
  accountId: number;
  hand: CardId[];
  score: number;
  isConnected: boolean;
  isEliminated: boolean;
  seatIndex: number;
  timeoutCount: number;
  isBot: boolean;
}

export interface DiscardPileState {
  // The set most recently discarded — shown on top of the pile; drawable by the NEXT player
  currentSet: CardId[];
  // Older sets. The last entry is what the current player saw before discarding — that's
  // what discard_first / discard_last draw from. All entries are also used for reshuffling.
  previousSets: CardId[][];
}

export interface WaitingPlayer {
  userId: string;
  displayName: string;
  accountId: number;
}

export interface GameState {
  tableId: string;
  roomCode: string;
  hostId: string;
  settings: GameSettings;
  phase: GamePhase;
  // Keyed by userId
  players: Record<string, PlayerRecord>;
  // Ordered seat positions; eliminated players stay in array (skipped during play)
  seatOrder: string[];
  currentTurnIndex: number;
  deck: CardId[];
  discardPile: DiscardPileState;
  roundNumber: number;
  // Set when Yaniv is called; cleared after round resolution
  yanivCallerId: string | null;
  // Preserved across between_rounds to seed next round's start seat
  lastRoundCallerId: string | null;
  turnDeadlineEpoch: number | null;
  // Set during player_turn_hadabaka: the card the player can throw back immediately
  hadabakaCard: CardId | null;
  createdAt: number;
  startedAt: number | null;
  // Players who joined mid-game; added to next game on table reset
  waitingPlayers: WaitingPlayer[];
}

// ============================================================
// Public (client-facing) types — no hand contents for opponents
// ============================================================

export interface PublicPlayerInfo {
  userId: string;
  displayName: string;
  seatIndex: number;
  cardCount: number;
  score: number;
  isConnected: boolean;
  isEliminated: boolean;
  isBot: boolean;
}

export interface PublicDiscardPile {
  currentSet: CardId[];
  deckCount: number;
}

// ============================================================
// WebSocket messages: Client → Server
// ============================================================

export type ClientMessage =
  | { type: 'join' }
  | { type: 'ready' }
  | { type: 'discard'; cards: CardId[] }
  | { type: 'draw'; source: DrawSource }
  | { type: 'call_yaniv' }
  | { type: 'hadabaka_accept' }
  | { type: 'chat'; text: string }
  | { type: 'ping'; clientTs: number };

// ============================================================
// WebSocket messages: Server → Client
// ============================================================

export interface StateSnapshotMessage {
  type: 'state_snapshot';
  tableId: string;
  hostId: string;
  maxPlayers: number;
  phase: GamePhase;
  roundNumber: number;
  currentTurnUserId: string | null;
  turnDeadlineEpoch: number | null;
  players: PublicPlayerInfo[];
  myHand: CardId[];
  discardPile: PublicDiscardPile;
  // IDs of players in the waiting queue (joined mid-game, will play next round)
  waitingPlayerIds: string[];
  // Set during player_turn_hadabaka: the card the current player can throw back.
  // Only sent to the player whose turn it is; null for all others.
  hadabakaCard: CardId | null;
}

export interface TurnDeltaMessage {
  type: 'turn_delta';
  actingUserId: string;
  action: 'discard' | 'draw';
  // Present when action === 'discard'
  discardedCards: CardId[] | null;
  // Present when action === 'draw'
  drawnSource: DrawSource | null;
  newDiscardPile: PublicDiscardPile;
  nextTurnUserId: string;
  turnDeadlineEpoch: number;
  opponentCardCounts: Record<string, number>;
  // Only populated for the player who just drew
  myNewCard: CardId | null;
  myHand: CardId[] | null;
}

export interface YanivCalledMessage {
  type: 'yaniv_called';
  callerId: string;
  // All hands revealed to all players simultaneously
  allHands: Record<string, CardId[]>;
  callerTotal: number;
}

export interface RoundResultMessage {
  type: 'round_result';
  callType: 'yaniv' | 'assaf';
  callerId: string;
  assafByIds: string[];
  handsRevealed: Record<string, { cards: CardId[]; total: number }>;
  scoreDeltas: Record<string, number>;
  penaltyApplied: boolean;
  newScores: Record<string, number>;
  eliminatedThisRound: string[];
  scoreResetApplied: string[];
  nextRoundStartsIn: number;
}

export interface PresenceMessage {
  type: 'presence';
  userId: string;
  connected: boolean;
  reconnectWindowMs: number;
}

export interface GameOverMessage {
  type: 'game_over';
  winnerId: string;
  winnerName: string;
  finalScores: Record<string, number>;
  eliminationOrder: string[];
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export interface ChatMessage {
  type: 'chat';
  fromUserId: string;
  fromDisplayName: string;
  text: string;
  ts: number;
}

export interface PongMessage {
  type: 'pong';
  serverTs: number;
  clientTs: number;
}

export type ServerMessage =
  | StateSnapshotMessage
  | TurnDeltaMessage
  | YanivCalledMessage
  | RoundResultMessage
  | PresenceMessage
  | GameOverMessage
  | ErrorMessage
  | ChatMessage
  | PongMessage;

// ============================================================
// D1 row shapes
// ============================================================

export interface UserRow {
  id: string;
  account_id: number;
  display_name: string;
  created_at: number;
  last_seen_at: number;
}

export interface TableRow {
  id: string;
  room_code: string;
  host_id: string;
  status: 'waiting' | 'in_progress' | 'finished' | 'cancelled';
  max_players: number;
  yaniv_threshold: number;
  turn_timeout_seconds: number;
  is_ranked: number;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  winner_id: string | null;
}

// ============================================================
// Cloudflare environment bindings
// ============================================================

export interface Env {
  GAME_TABLE: DurableObjectNamespace;
  DB: D1Database;
  SESSIONS: KVNamespace;
  APPLE_APP_BUNDLE_ID: string;
  ENVIRONMENT: string;
}

// ============================================================
// Internal DO HTTP payload shapes
// ============================================================

export interface AddPlayerPayload {
  userId: string;
  displayName: string;
  accountId: number;
}

export interface AddBotPayload {
  count: number; // 1–3
}

export interface InitTablePayload {
  tableId: string;
  roomCode: string;
  hostId: string;
  hostDisplayName: string;
  hostAccountId: number;
  settings: GameSettings;
  /** When true the host is NOT added as a player (used for public/seeded tables). */
  isPublicTable?: boolean;
}
