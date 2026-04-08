import { create } from 'zustand';
import { WSManager } from '../networking/wsManager';
import { isValidDiscard, handTotal } from '../utils/cardUtils';
import { getStrings } from '../strings';
import type {
  CardId,
  DrawSource,
  GamePhase,
  PublicPlayerInfo,
  PublicDiscardPile,
  ChatMessage,
  YanivCalledMessage,
  RoundResultMessage,
  GameOverMessage,
  ServerMessage,
} from '../shared/types';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error' | 'success';
}

interface GameStore {
  // ── Connection ──────────────────────────────────────────
  connectionState: ConnectionState;
  tableId: string | null;
  roomCode: string | null;

  // ── Server-authoritative state ──────────────────────────
  phase: GamePhase | null;
  roundNumber: number;
  currentTurnUserId: string | null;
  turnDeadlineEpoch: number | null;
  players: PublicPlayerInfo[];
  myHand: CardId[];
  discardPile: PublicDiscardPile;

  // ── Chat ─────────────────────────────────────────────────
  chatMessages: ChatMessage[];

  // ── Overlays ─────────────────────────────────────────────
  yanivCalled: YanivCalledMessage | null;
  roundResult: RoundResultMessage | null;
  gameOver: GameOverMessage | null;

  // ── Local UI state ────────────────────────────────────────
  selectedCards: CardId[];
  toasts: Toast[];
  waitingPlayerIds: string[];

  // ── Derived (computed in actions, not stored separately) ──
  // use selectors below

  // ── Actions ──────────────────────────────────────────────
  connect: (tableId: string, roomCode: string, token: string, myUserId: string) => void;
  disconnect: () => void;
  toggleCard: (cardId: CardId) => void;
  clearSelection: () => void;
  discard: () => void;
  draw: (source: DrawSource) => void;
  callYaniv: () => void;
  readyUp: () => void;
  sendChat: (text: string) => void;
  dismissRoundResult: () => void;
  addToast: (message: string, kind?: Toast['kind']) => void;
  removeToast: (id: number) => void;
}

// Keep WS manager outside store to avoid Zustand serialization issues
let wsManager: WSManager | null = null;
let myUserId = '';
let toastCounter = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  connectionState: 'idle',
  tableId: null,
  roomCode: null,
  phase: null,
  roundNumber: 0,
  currentTurnUserId: null,
  turnDeadlineEpoch: null,
  players: [],
  myHand: [],
  discardPile: { currentSet: [], deckCount: 0 },
  chatMessages: [],
  yanivCalled: null,
  roundResult: null,
  gameOver: null,
  selectedCards: [],
  toasts: [],
  waitingPlayerIds: [],

  connect: (tableId, roomCode, token, userId) => {
    myUserId = userId;
    wsManager?.destroy();
    set({ connectionState: 'connecting', tableId, roomCode });

    wsManager = new WSManager(
      tableId,
      token,
      (msg: ServerMessage) => handleServerMessage(msg, set, get),
      (state) => {
        set({ connectionState: state });
        if (state === 'reconnecting') {
          get().addToast('מתחבר מחדש...', 'info');
        }
      },
    );
    wsManager.connect();
  },

  disconnect: () => {
    wsManager?.destroy();
    wsManager = null;
    set({
      connectionState: 'idle',
      tableId: null,
      roomCode: null,
      phase: null,
      players: [],
      myHand: [],
      selectedCards: [],
      yanivCalled: null,
      roundResult: null,
      gameOver: null,
    });
  },

  toggleCard: (cardId) => {
    const { selectedCards, phase, currentTurnUserId } = get();
    if (phase !== 'player_turn_discard' || currentTurnUserId !== myUserId) return;
    const idx = selectedCards.indexOf(cardId);
    const next =
      idx === -1 ? [...selectedCards, cardId] : selectedCards.filter((c) => c !== cardId);
    set({ selectedCards: next });
  },

  clearSelection: () => set({ selectedCards: [] }),

  discard: () => {
    const { selectedCards } = get();
    if (!isValidDiscard(selectedCards)) return;
    wsManager?.send({ type: 'discard', cards: selectedCards });
    set({ selectedCards: [] });
  },

  draw: (source) => {
    wsManager?.send({ type: 'draw', source });
  },

  callYaniv: () => {
    wsManager?.send({ type: 'call_yaniv' });
  },

  readyUp: () => {
    wsManager?.send({ type: 'ready' });
  },

  sendChat: (text) => {
    if (!text.trim()) return;
    wsManager?.send({ type: 'chat', text: text.trim() });
  },

  dismissRoundResult: () => set({ roundResult: null, yanivCalled: null }),

  addToast: (message, kind = 'info') => {
    const id = ++toastCounter;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ── Selectors ─────────────────────────────────────────────────

export const selectIsMyTurn = (s: GameStore) =>
  s.currentTurnUserId === myUserId;

export const selectMyHandTotal = (s: GameStore) => handTotal(s.myHand);

export const selectCanCallYaniv = (s: GameStore, threshold: number) =>
  s.phase === 'player_turn_discard' &&
  s.currentTurnUserId === myUserId &&
  handTotal(s.myHand) <= threshold;

export const selectCanDiscard = (s: GameStore) =>
  s.phase === 'player_turn_discard' &&
  s.currentTurnUserId === myUserId &&
  isValidDiscard(s.selectedCards);

export const selectCanDraw = (s: GameStore) =>
  s.phase === 'player_turn_draw' && s.currentTurnUserId === myUserId;

export const selectMe = (s: GameStore) =>
  s.players.find((p) => p.userId === myUserId);

export const selectIsWaitingPlayer = (s: GameStore) =>
  s.waitingPlayerIds.includes(myUserId);

// ── Server message handler ────────────────────────────────────

type SetFn = (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void;
type GetFn = () => GameStore;

function handleServerMessage(msg: ServerMessage, set: SetFn, get: GetFn) {

  switch (msg.type) {
    case 'state_snapshot':
      set({
        phase: msg.phase,
        roundNumber: msg.roundNumber,
        currentTurnUserId: msg.currentTurnUserId,
        turnDeadlineEpoch: msg.turnDeadlineEpoch,
        players: msg.players,
        myHand: msg.myHand,
        discardPile: msg.discardPile,
        waitingPlayerIds: msg.waitingPlayerIds ?? [],
        selectedCards: [],
        // Clear overlays when table resets for a new game
        ...(msg.phase === 'waiting_for_players' ? { gameOver: null, roundResult: null, yanivCalled: null } : {}),
      });
      break;

    case 'turn_delta':
      set((s) => {
        const updatedPlayers = s.players.map((p) => ({
          ...p,
          cardCount: msg.opponentCardCounts[p.userId] ?? p.cardCount,
        }));
        // Update our hand if we drew
        const myHand = msg.myHand ?? s.myHand;
        return {
          players: updatedPlayers,
          myHand,
          discardPile: msg.newDiscardPile,
          currentTurnUserId: msg.nextTurnUserId,
          turnDeadlineEpoch: msg.turnDeadlineEpoch,
          phase:
            msg.action === 'discard' && msg.nextTurnUserId === myUserId
              ? 'player_turn_draw'
              : 'player_turn_discard',
          selectedCards: [],
        };
      });
      break;

    case 'yaniv_called':
      set({ yanivCalled: msg, phase: 'yaniv_called' });
      break;

    case 'round_result':
      set({ roundResult: msg, phase: 'between_rounds' });
      // Update scores in players list
      set((s) => ({
        players: s.players.map((p) => ({
          ...p,
          score: msg.newScores[p.userId] ?? p.score,
          isEliminated: s.players.find(pl => pl.userId === p.userId)?.isEliminated ||
            msg.eliminatedThisRound.includes(p.userId),
        })),
      }));
      break;

    case 'presence':
      set((s) => ({
        players: s.players.map((p) =>
          p.userId === msg.userId ? { ...p, isConnected: msg.connected } : p,
        ),
      }));
      break;

    case 'game_over':
      set({ gameOver: msg, phase: 'game_over' });
      break;

    case 'error':
      get().addToast(getStrings().errors[msg.code] ?? getStrings().errors.unknown, 'error');
      break;

    case 'chat':
      set((s) => ({ chatMessages: [...s.chatMessages.slice(-199), msg] }));
      break;
  }
}
