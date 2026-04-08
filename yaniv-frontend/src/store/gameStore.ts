import { create } from 'zustand';
import { WSManager } from '../networking/wsManager';
import { isValidDiscard, handTotal } from '../utils/cardUtils';
import { getStrings } from '../strings';
import {
  playYaniv,
  playAsaf,
  playCardDiscard,
  playCardDraw,
  playMyTurn,
  playOpponentPlay,
  playRoundWin,
  playPenalty,
  playGameWin,
} from '../utils/soundManager';
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
  hostId: string | null;
  maxPlayers: number;
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
  // Set for the drawing player during player_turn_hadabaka phase
  hadabakaCard: CardId | null;

  // ── Derived (computed in actions, not stored separately) ──
  // use selectors below

  // ── Actions ──────────────────────────────────────────────
  connect: (tableId: string, roomCode: string, token: string, myUserId: string) => void;
  disconnect: () => void;
  toggleCard: (cardId: CardId) => void;
  clearSelection: () => void;
  discardAndDraw: (source: DrawSource) => void;
  callYaniv: () => void;
  hadabakaAccept: () => void;
  readyUp: () => void;
  sendChat: (text: string) => void;
  dismissRoundResult: () => void;
  addToast: (message: string, kind?: Toast['kind']) => void;
  removeToast: (id: number) => void;

  // internal — pending draw source after a discard is sent
  _pendingDrawSource: DrawSource | null;
}

// Keep WS manager outside store to avoid Zustand serialization issues
let wsManager: WSManager | null = null;
let myUserId = '';
let toastCounter = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  connectionState: 'idle',
  tableId: null,
  roomCode: null,
  hostId: null,
  maxPlayers: 0,
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
  hadabakaCard: null,
  _pendingDrawSource: null,

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
      hostId: null,
      maxPlayers: 0,
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

  discardAndDraw: (source) => {
    const { selectedCards } = get();
    if (!isValidDiscard(selectedCards)) return;
    set({ _pendingDrawSource: source, selectedCards: [] });
    wsManager?.send({ type: 'discard', cards: selectedCards });
  },

  callYaniv: () => {
    wsManager?.send({ type: 'call_yaniv' });
  },

  hadabakaAccept: () => {
    wsManager?.send({ type: 'hadabaka_accept' });
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

// True when the player has a valid selection and can trigger a discard+draw
export const selectCanDiscardAndDraw = (s: GameStore) =>
  s.phase === 'player_turn_discard' &&
  s.currentTurnUserId === myUserId &&
  isValidDiscard(s.selectedCards);

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
      const shouldClearRoundOverlay =
        msg.phase !== 'between_rounds' && msg.phase !== 'yaniv_called';
      set({
        hostId: msg.hostId,
        maxPlayers: msg.maxPlayers,
        phase: msg.phase,
        roundNumber: msg.roundNumber,
        currentTurnUserId: msg.currentTurnUserId,
        turnDeadlineEpoch: msg.turnDeadlineEpoch,
        players: msg.players,
        myHand: msg.myHand,
        discardPile: msg.discardPile,
        waitingPlayerIds: msg.waitingPlayerIds ?? [],
        hadabakaCard: msg.hadabakaCard ?? null,
        selectedCards: [],
        ...(shouldClearRoundOverlay ? { roundResult: null, yanivCalled: null } : {}),
        ...(msg.phase === 'waiting_for_players' ? { gameOver: null } : {}),
      });
      break;

    case 'turn_delta':
      set((s) => {
        const updatedPlayers = s.players.map((p) => ({
          ...p,
          cardCount: msg.opponentCardCounts[p.userId] ?? p.cardCount,
        }));
        // Update our hand: server sends it on draw; on discard, remove the cards we just threw
        const myHand =
          msg.myHand ??
          (msg.action === 'discard' && msg.actingUserId === myUserId && msg.discardedCards
            ? s.myHand.filter((c) => !msg.discardedCards!.includes(c))
            : s.myHand);
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
      // Play sound based on action
      if (msg.action === 'discard') {
        if (msg.actingUserId === myUserId) {
          playCardDiscard();
        } else {
          playOpponentPlay();
        }
        // Notify when it becomes my turn to discard
        if (msg.nextTurnUserId === myUserId) {
          playMyTurn();
        }
      } else if (msg.action === 'draw') {
        playCardDraw();
      }
      // If we just discarded and have a queued draw source, send it immediately
      if (msg.action === 'discard' && msg.nextTurnUserId === myUserId) {
        const pending = get()._pendingDrawSource;
        if (pending) {
          set({ _pendingDrawSource: null });
          wsManager?.send({ type: 'draw', source: pending });
        }
      }
      break;

    case 'yaniv_called':
      set({ yanivCalled: msg, phase: 'yaniv_called' });
      playYaniv();
      break;

    case 'round_result':
      set({ roundResult: msg, yanivCalled: null, phase: 'between_rounds' });
      // Update scores in players list
      set((s) => ({
        players: s.players.map((p) => ({
          ...p,
          score: msg.newScores[p.userId] ?? p.score,
          isEliminated: s.players.find(pl => pl.userId === p.userId)?.isEliminated ||
            msg.eliminatedThisRound.includes(p.userId),
        })),
      }));
      // Play sound based on round outcome
      if (msg.callType === 'assaf') {
        // Small delay so yaniv.wav finishes first
        setTimeout(() => playAsaf(), 800);
      } else if (msg.callerId === myUserId) {
        playRoundWin();
      } else {
        playPenalty();
      }
      break;

    case 'presence':
      set((s) => ({
        players: s.players.map((p) =>
          p.userId === msg.userId ? { ...p, isConnected: msg.connected } : p,
        ),
      }));
      break;

    case 'game_over':
      set({ gameOver: msg, roundResult: null, yanivCalled: null, phase: 'game_over' });
      if (msg.winnerId === myUserId) {
        playGameWin();
      } else {
        playPenalty();
      }
      break;

    case 'error':
      set({ _pendingDrawSource: null });
      get().addToast(getStrings().errors[msg.code] ?? getStrings().errors.unknown, 'error');
      break;

    case 'chat':
      set((s) => ({ chatMessages: [...s.chatMessages.slice(-199), msg] }));
      break;
  }
}
