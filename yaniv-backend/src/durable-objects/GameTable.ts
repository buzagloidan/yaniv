import type {
  Env,
  GameState,
  ClientMessage,
  CardId,
  DrawSource,
  AddPlayerPayload,
  AddBotPayload,
  InitTablePayload,
  TurnDeltaMessage,
  YanivCalledMessage,
  RoundResultMessage,
  GameOverMessage,
} from '../shared/types';
import { ErrorCode } from '../shared/errors';
import { DEFAULTS } from '../shared/constants';
import {
  initGameState,
  addPlayer,
  removePlayer,
  startGame,
  startNextRound,
  resetTableState,
  applyDiscard,
  applyDraw,
  applyYanivCall,
  applyRoundResolution,
  applyAutoDiscard,
  eliminatePlayerMidRound,
  applyHadabakaAccept,
  applyHadabakaDecline,
  pauseGame,
  resumePausedGame,
} from './stateMachine';
import { validateDiscard, validateDraw, validateYanivCall } from './validator';
import { BroadcastManager, buildSnapshot } from './broadcastManager';
import { handTotal, selectBotDiscard } from './gameLogic';
import { clearTablePlayers, addTablePlayer } from '../db/queries';

// ============================================================
// GameTable Durable Object
// One instance per game table.  Uses the Cloudflare hibernatable
// WebSocket API so the DO can sleep when all players are idle.
// ============================================================

export class GameTable implements DurableObject {
  private readonly ctx: DurableObjectState;
  private readonly env: Env;
  private readonly broadcast = new BroadcastManager();

  // In-memory cache of game state (populated lazily from DO storage)
  private cached: GameState | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.ctx = state;
    this.env = env;
  }

  private hydrateBroadcastMap(): void {
    for (const ws of this.ctx.getWebSockets()) {
      const userId = this.ctx.getTags(ws)[0];
      if (userId && !this.broadcast.has(userId)) {
        this.broadcast.add(userId, ws);
      }
    }
  }

  // ============================================================
  // fetch() — entry point for all HTTP and WebSocket requests
  // ============================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade: forwarded from the Worker gateway
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWsUpgrade(request);
    }

    // Internal HTTP fetches can wake a hibernated DO. Rebuild the live socket map
    // first so waiting-room broadcasts still reach already connected players.
    this.hydrateBroadcastMap();

    // Internal HTTP calls from the Worker (not exposed to the internet)
    switch (url.pathname) {
      case '/internal/init':
        return this.handleInit(request);
      case '/internal/add-player':
        return this.handleAddPlayer(request);
      case '/internal/add-bot':
        return this.handleAddBot(request);
      case '/internal/remove-player':
        return this.handleRemovePlayer(request);
      case '/internal/status':
        return this.handleStatus();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  // ============================================================
  // WebSocket upgrade
  // ============================================================

  private async handleWsUpgrade(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    const state = await this.loadState();
    if (!state) {
      return new Response('Table not found', { status: 404 });
    }

    const isActivePlayer = !!state.players[userId];
    const isWaitingPlayer = state.waitingPlayers.some((p) => p.userId === userId);
    if (!isActivePlayer && !isWaitingPlayer) {
      return new Response('Not a member of this table', { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    // Tag the server-side socket with the userId for hibernation recovery
    this.ctx.acceptWebSocket(server, [userId]);

    return new Response(null, { status: 101, webSocket: client });
  }

  // ============================================================
  // Hibernatable WebSocket event handlers
  // ============================================================

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const userId = this.ctx.getTags(ws)[0];
    if (!userId) return;

    // Rebuild the broadcast map after hibernation wakeup
    if (!this.broadcast.has(userId)) {
      this.broadcast.add(userId, ws);
    }

    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      this.sendError(ws, ErrorCode.INVALID_MESSAGE, 'Invalid JSON');
      return;
    }

    const state = await this.loadState();
    if (!state) {
      this.sendError(ws, ErrorCode.TABLE_NOT_FOUND, 'Table not initialised');
      return;
    }

    await this.dispatch(userId, ws, msg, state);
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const userId = this.ctx.getTags(ws)[0];
    if (!userId) return;
    this.broadcast.remove(userId);
    await this.markDisconnected(userId);
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    const userId = this.ctx.getTags(ws)[0];
    if (!userId) return;
    this.broadcast.remove(userId);
    await this.markDisconnected(userId);
  }

  // ============================================================
  // Alarm — fires for turn timeouts and between-round delays
  // ============================================================

  async alarm(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;

    this.hydrateBroadcastMap();

    if (state.pauseState) {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const currentPlayerId = state.seatOrder[state.currentTurnIndex];
    const isBot = state.players[currentPlayerId]?.isBot;

    if (
      isBot &&
      (state.phase === 'player_turn_discard' || state.phase === 'player_turn_draw')
    ) {
      await this.handleBotPlay(state);
    } else if (
      state.phase === 'player_turn_discard' ||
      state.phase === 'player_turn_draw'
    ) {
      await this.handleTurnTimeout(state);
    } else if (state.phase === 'player_turn_hadabaka') {
      // Window expired — auto-decline, keep the drawn card
      await this.handleHadabakaTimeout(state);
    } else if (state.phase === 'between_rounds') {
      await this.handleBetweenRoundsTimeout(state);
    } else if (state.phase === 'game_over') {
      await this.handleGameOverReset(state);
    }
  }

  // ============================================================
  // Message dispatcher
  // ============================================================

  private async dispatch(
    userId: string,
    ws: WebSocket,
    msg: ClientMessage,
    state: GameState,
  ): Promise<void> {
    if (
      state.pauseState &&
      msg.type !== 'join' &&
      msg.type !== 'ping' &&
      msg.type !== 'chat' &&
      msg.type !== 'continue_game'
    ) {
      this.sendError(ws, ErrorCode.GAME_PAUSED, 'Game is paused until a human continues');
      return;
    }

    switch (msg.type) {
      case 'join':    return this.handleJoin(userId, ws, state);
      case 'ready':   return this.handleReady(userId, ws, state);
      case 'continue_game': return this.handleContinueGame(userId, ws, state);
      case 'discard': return this.handleDiscard(userId, ws, state, msg.cards);
      case 'draw':    return this.handleDraw(userId, ws, state, msg.source);
      case 'call_yaniv': return this.handleCallYaniv(userId, ws, state);
      case 'hadabaka_accept': return this.handleHadabakaAccept(userId, ws, state);
      case 'chat':    return this.handleChat(userId, ws, state, msg.text);
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', serverTs: Date.now(), clientTs: msg.clientTs }));
        break;
    }
  }

  // ============================================================
  // join — register socket, mark connected, send full snapshot
  // ============================================================

  private async handleJoin(userId: string, ws: WebSocket, state: GameState): Promise<void> {
    this.broadcast.add(userId, ws);

    // If this player is in the waiting queue (joined mid-game), just show them the state
    const isWaiting = state.waitingPlayers.some((p) => p.userId === userId);
    if (isWaiting) {
      ws.send(JSON.stringify(buildSnapshot(state, userId)));
      return;
    }

    if (!state.players[userId]) {
      this.sendError(ws, ErrorCode.NOT_A_MEMBER, 'Not a member of this table');
      return;
    }

    const updatedState = patchPlayer(state, userId, { isConnected: true });
    await this.saveState(updatedState);

    // Send the joining player their personalised snapshot
    ws.send(JSON.stringify(buildSnapshot(updatedState, userId)));

    // Notify others that this player is (re)connected
    this.broadcast.broadcastAll({
      type: 'presence',
      userId,
      connected: true,
      reconnectWindowMs: 0,
    });

    if (
      updatedState.phase === 'waiting_for_players' &&
      this.canAutoStartWaitingTable(updatedState)
    ) {
      await this.autoStart(updatedState);
    }
  }

  // ============================================================
  // Auto-start the game (called when min players are connected)
  // ============================================================

  private async autoStart(state: GameState): Promise<void> {
    const newState = startGame(state);
    await this.saveState(newState);
    await this.setAlarm(newState);
    this.broadcast.broadcastSnapshot(newState);

    this.env.DB.prepare(
      "UPDATE tables SET status = 'in_progress', started_at = ? WHERE id = ?",
    )
      .bind(Date.now(), state.tableId)
      .run()
      .catch(() => { /* non-critical */ });
  }

  // ============================================================
  // ready — host starts the game
  // ============================================================

  private async handleReady(userId: string, ws: WebSocket, state: GameState): Promise<void> {
    if (state.phase !== 'waiting_for_players') {
      this.sendError(ws, ErrorCode.GAME_ALREADY_STARTED, 'Game already started');
      return;
    }

    if (userId !== state.hostId) {
      this.sendError(ws, ErrorCode.NOT_HOST, 'Only the host can start');
      return;
    }

    const connected = Object.values(state.players).filter((p) => p.isConnected);
    if (connected.length < DEFAULTS.MIN_PLAYERS) {
      this.sendError(ws, ErrorCode.INVALID_MESSAGE, 'Need at least 2 connected players');
      return;
    }

    await this.autoStart(state);
  }

  private async handleContinueGame(
    userId: string,
    ws: WebSocket,
    state: GameState,
  ): Promise<void> {
    if (!state.pauseState) {
      this.sendError(ws, ErrorCode.WRONG_PHASE, 'Game is not paused');
      return;
    }

    const player = state.players[userId];
    if (!player || player.isBot) {
      this.sendError(ws, ErrorCode.NOT_A_MEMBER, 'Only a human player can continue the game');
      return;
    }

    const resumedState = resumePausedGame(state);
    await this.saveState(resumedState);
    await this.setAlarm(resumedState);
    this.broadcast.broadcastSnapshot(resumedState);
  }

  // ============================================================
  // discard
  // ============================================================

  private async handleDiscard(
    userId: string,
    ws: WebSocket,
    state: GameState,
    cards: CardId[],
  ): Promise<void> {
    const v = validateDiscard(userId, cards, state);
    if (!v.valid) {
      this.sendError(ws, v.code, 'Invalid discard');
      return;
    }

    const newState = applyDiscard(state, userId, cards);
    await this.saveState(newState);
    await this.setAlarm(newState);

    const opponentCardCounts: Record<string, number> = {};
    for (const [pid, p] of Object.entries(newState.players)) {
      if (pid !== userId) opponentCardCounts[pid] = p.hand.length;
    }

    const delta: TurnDeltaMessage = {
      type: 'turn_delta',
      actingUserId: userId,
      action: 'discard',
      discardedCards: cards,
      drawnSource: null,
      newDiscardPile: {
        currentSet: newState.discardPile.currentSet,
        deckCount: newState.deck.length,
      },
      // Still this player's turn (draw phase)
      nextTurnUserId: userId,
      turnDeadlineEpoch: newState.turnDeadlineEpoch!,
      opponentCardCounts,
      myNewCard: null,
      myHand: null,
    };

    this.broadcast.broadcastAll(delta);
  }

  // ============================================================
  // draw
  // ============================================================

  private async handleDraw(
    userId: string,
    ws: WebSocket,
    state: GameState,
    source: DrawSource,
  ): Promise<void> {
    const v = validateDraw(userId, source, state);
    if (!v.valid) {
      this.sendError(ws, v.code, 'Invalid draw');
      return;
    }

    const { newState, drawnCard, isHadabaka } = applyDraw(state, userId, source);
    await this.saveState(newState);
    await this.setAlarm(newState);

    if (isHadabaka) {
      // Broadcast a personalised snapshot so each player sees the new phase.
      // The drawer sees their hadabakaCard; others see null.
      this.broadcast.broadcastSnapshot(newState);
      return;
    }

    const nextTurnUserId = newState.seatOrder[newState.currentTurnIndex];

    const opponentCardCounts: Record<string, number> = {};
    for (const [pid, p] of Object.entries(newState.players)) {
      if (pid !== userId) opponentCardCounts[pid] = p.hand.length;
    }

    // Each player receives a personalised delta: only the drawer sees their new card
    for (const recipientId of this.broadcast.connectedUserIds()) {
      const isDrawer = recipientId === userId;
      const delta: TurnDeltaMessage = {
        type: 'turn_delta',
        actingUserId: userId,
        action: 'draw',
        discardedCards: null,
        drawnSource: source,
        newDiscardPile: {
          currentSet: newState.discardPile.currentSet,
          deckCount: newState.deck.length,
        },
        nextTurnUserId,
        turnDeadlineEpoch: newState.turnDeadlineEpoch!,
        opponentCardCounts,
        myNewCard: isDrawer ? drawnCard : null,
        myHand: isDrawer ? newState.players[userId].hand : null,
      };
      this.broadcast.sendTo(recipientId, delta);
    }
  }

  // ============================================================
  // call_yaniv
  // ============================================================

  private async handleCallYaniv(userId: string, ws: WebSocket, state: GameState): Promise<void> {
    const v = validateYanivCall(userId, state);
    if (!v.valid) {
      this.sendError(ws, v.code, 'Cannot call Yaniv');
      return;
    }

    // 1. Reveal all hands
    const yanivState = applyYanivCall(state, userId);
    const allHands: Record<string, CardId[]> = {};
    for (const [id, p] of Object.entries(yanivState.players)) {
      if (!p.isEliminated) allHands[id] = p.hand;
    }

    const yanivMsg: YanivCalledMessage = {
      type: 'yaniv_called',
      callerId: userId,
      allHands,
      callerTotal: handTotal(state.players[userId].hand),
    };
    this.broadcast.broadcastAll(yanivMsg);

    // 2. Resolve round
    const { newState, resolution, isMatchOver, winnerId } = applyRoundResolution(yanivState);
    const persistedState = this.pauseIfNeededAfterRound(newState, userId);
    await this.saveState(persistedState);
    await this.ctx.storage.deleteAlarm();

    // 3. Build and broadcast round result
    const handsRevealed: RoundResultMessage['handsRevealed'] = {};
    for (const [id, hand] of Object.entries(allHands)) {
      handsRevealed[id] = { cards: hand, total: handTotal(hand) };
    }

    const roundResult: RoundResultMessage = {
      type: 'round_result',
      callType: resolution.isAssaf ? 'assaf' : 'yaniv',
      callerId: userId,
      assafByIds: resolution.assafPlayerIds,
      handsRevealed,
      scoreDeltas: resolution.scoreDeltas,
      penaltyApplied: resolution.isAssaf,
      newScores: resolution.newScores,
      eliminatedThisRound: resolution.eliminatedPlayerIds,
      scoreResetApplied: resolution.resetPlayerIds,
      nextRoundStartsIn: isMatchOver ? 0 : DEFAULTS.BETWEEN_ROUNDS_DELAY_MS,
    };
    this.broadcast.broadcastAll(roundResult);

    if (persistedState.pauseState) {
      this.broadcast.broadcastSnapshot(persistedState);
    }

    // 4. End or continue
    if (isMatchOver) {
      await this.concludeMatch(persistedState, winnerId);
    } else if (!persistedState.pauseState) {
      await this.setAlarm(persistedState);
    }
  }

  // ============================================================
  // hadabaka_accept — player throws back the matching card
  // ============================================================

  private async handleHadabakaAccept(
    userId: string,
    ws: WebSocket,
    state: GameState,
  ): Promise<void> {
    if (state.phase !== 'player_turn_hadabaka') {
      this.sendError(ws, ErrorCode.WRONG_PHASE, 'Not in hadabaka phase');
      return;
    }
    const currentPlayerId = state.seatOrder[state.currentTurnIndex];
    if (userId !== currentPlayerId) {
      this.sendError(ws, ErrorCode.NOT_YOUR_TURN, 'Not your hadabaka');
      return;
    }

    const newState = applyHadabakaAccept(state, userId);
    await this.saveState(newState);
    await this.setAlarm(newState);
    this.broadcast.broadcastSnapshot(newState);
  }

  // ============================================================
  // Hadabaka timeout — window expired, keep the card
  // ============================================================

  private async handleHadabakaTimeout(state: GameState): Promise<void> {
    const newState = applyHadabakaDecline(state);
    await this.saveState(newState);
    await this.setAlarm(newState);
    this.broadcast.broadcastSnapshot(newState);
  }

  // ============================================================
  // chat
  // ============================================================

  private async handleChat(
    userId: string,
    _ws: WebSocket,
    state: GameState,
    text: string,
  ): Promise<void> {
    if (!text || typeof text !== 'string') return;

    // Strip control characters; truncate
    const sanitized = text.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, DEFAULTS.MAX_CHAT_LENGTH);
    if (!sanitized) return;

    const player = state.players[userId];
    if (!player) return;

    this.broadcast.broadcastAll({
      type: 'chat',
      fromUserId: userId,
      fromDisplayName: player.displayName,
      text: sanitized,
      ts: Date.now(),
    });
  }

  // ============================================================
  // Turn timeout (alarm fired during player_turn_*)
  // ============================================================

  private async handleTurnTimeout(state: GameState): Promise<void> {
    const playerId = state.seatOrder[state.currentTurnIndex];
    const player = state.players[playerId];

    if (
      player &&
      !player.isBot &&
      this.shouldPauseForMissingHumans(state, playerId)
    ) {
      const pausedState = pauseGame(state, playerId, 'timeout');
      await this.saveState(pausedState);
      await this.setAlarm(pausedState);
      this.broadcast.broadcastSnapshot(pausedState);
      return;
    }

    if (state.phase === 'player_turn_discard') {
      // Auto-discard the highest-value card
      const { newState: afterDiscard, shouldEliminate } = applyAutoDiscard(state, playerId);

      if (shouldEliminate) {
        // Player exceeded timeout limit — eliminate
        const { newState: afterElim, isMatchOver, winnerId } = eliminatePlayerMidRound(
          afterDiscard,
          playerId,
        );
        await this.saveState(afterElim);

        // Notify everyone
        this.broadcast.broadcastAll({ type: 'presence', userId: playerId, connected: false, reconnectWindowMs: 0 });

        if (isMatchOver) {
          await this.concludeMatch(afterElim, winnerId);
        } else {
          // Auto-draw for eliminated player is skipped; their hand is discarded
          await this.setAlarm(afterElim);
          this.broadcast.broadcastSnapshot(afterElim);
        }
        return;
      }

      // Not eliminated — auto-draw from deck
      const { newState: afterDraw, isHadabaka } = applyDraw(afterDiscard, playerId, 'deck');
      // Timed-out player doesn't get a hadabaka window — decline immediately
      const finalState = isHadabaka ? applyHadabakaDecline(afterDraw) : afterDraw;
      await this.saveState(finalState);
      await this.setAlarm(finalState);

      // Broadcast via snapshots (simplest safe path for auto-play)
      this.broadcast.broadcastSnapshot(finalState);

    } else if (state.phase === 'player_turn_draw') {
      // Auto-draw from deck (timeout during draw phase doesn't add to timeoutCount)
      const { newState: afterDraw, isHadabaka } = applyDraw(state, playerId, 'deck');
      // Timed-out player doesn't get a hadabaka window — decline immediately
      const finalState = isHadabaka ? applyHadabakaDecline(afterDraw) : afterDraw;
      await this.saveState(finalState);
      await this.setAlarm(finalState);
      this.broadcast.broadcastSnapshot(finalState);
    }
  }

  // ============================================================
  // Between-rounds timeout (alarm fired during between_rounds)
  // ============================================================

  private async handleBetweenRoundsTimeout(state: GameState): Promise<void> {
    const newState = startNextRound(state);
    await this.saveState(newState);
    await this.setAlarm(newState);
    this.broadcast.broadcastSnapshot(newState);
  }

  // ============================================================
  // Match conclusion helper
  // ============================================================

  private async concludeMatch(state: GameState, winnerId: string | null): Promise<void> {
    if (winnerId) {
      const winner = state.players[winnerId];

      const gameOverMsg: GameOverMessage = {
        type: 'game_over',
        winnerId,
        winnerName: winner.displayName,
        finalScores: Object.fromEntries(
          Object.entries(state.players).map(([id, p]) => [id, p.score]),
        ),
        eliminationOrder: Object.values(state.players)
          .filter((p) => p.isEliminated)
          .map((p) => p.userId),
      };
      this.broadcast.broadcastAll(gameOverMsg);
    }

    // Schedule table reset after linger (so UI can show results)
    await this.ctx.storage.setAlarm(Date.now() + DEFAULTS.TABLE_RESET_DELAY_MS);
  }

  // ============================================================
  // Game-over alarm: reset table for a new game
  // ============================================================

  private async handleGameOverReset(state: GameState): Promise<void> {
    // Rebuild socket map from hibernated WebSockets
    const connectedUserIds = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      const userId = this.ctx.getTags(ws)[0];
      if (userId) {
        connectedUserIds.add(userId);
        if (!this.broadcast.has(userId)) {
          this.broadcast.add(userId, ws);
        }
      }
    }

    const resetState = resetTableState(state, connectedUserIds);
    await this.saveState(resetState);

    // Reset D1: clear stale players and reset table status (best-effort)
    clearTablePlayers(this.env.DB, state.tableId).catch(() => {});
    // Re-insert only real (non-bot) players
    for (const [uid, p] of Object.entries(resetState.players)) {
      if (!p.isBot) {
        addTablePlayer(this.env.DB, state.tableId, uid, p.seatIndex).catch(() => {});
      }
    }
    this.env.DB.prepare(
      "UPDATE tables SET status = 'waiting', started_at = NULL, finished_at = NULL, winner_id = NULL WHERE id = ?",
    )
      .bind(state.tableId)
      .run()
      .catch(() => { /* non-critical */ });

    // If enough connected players, auto-start immediately
    if (this.canAutoStartWaitingTable(resetState)) {
      await this.autoStart(resetState);
    } else {
      this.broadcast.broadcastSnapshot(resetState);
    }
  }

  // ============================================================
  // Internal HTTP: /internal/init
  // ============================================================

  private async handleInit(request: Request): Promise<Response> {
    const body = (await request.json()) as InitTablePayload;

    const existing = await this.loadState();
    if (existing) {
      // Idempotent — already initialised
      return json({ ok: true });
    }

    const settings = {
      ...body.settings,
      // Enforce ranked threshold lock
      yanivThreshold:
        body.settings.isRanked ? 7 : body.settings.yanivThreshold,
    };

    const host = body.isPublicTable
      ? null
      : { userId: body.hostId, displayName: body.hostDisplayName, accountId: body.hostAccountId };

    const state = initGameState(
      body.tableId,
      body.roomCode,
      body.hostId,
      host,
      settings,
      body.isPrivateTable ?? false,
    );

    await this.saveState(state);
    return json({ ok: true });
  }

  // ============================================================
  // Internal HTTP: /internal/add-player
  // ============================================================

  private async handleAddPlayer(request: Request): Promise<Response> {
    const body = (await request.json()) as AddPlayerPayload;
    const state = await this.loadState();

    if (!state) return json({ error: 'Table not found' }, 404);
    if (state.isPrivateTable) return json({ error: 'Table not found' }, 404);

    // Already an active player (reconnect scenario)
    if (state.players[body.userId]) {
      return json({ ok: true, alreadyJoined: true });
    }

    // Already in the waiting queue
    if (state.waitingPlayers.some((p) => p.userId === body.userId)) {
      return json({ ok: true, waiting: true });
    }

    if (state.phase === 'waiting_for_players') {
      if (state.seatOrder.length >= state.settings.maxPlayers) {
        return json({ error: ErrorCode.TABLE_FULL }, 409);
      }
      let newState = addPlayer(state, body);
      // First real player on an empty table (e.g. public table) becomes the host
      if (state.seatOrder.length === 0) {
        newState = { ...newState, hostId: body.userId };
      }
      await this.saveState(newState);
      // Existing waiting-room players need a full snapshot so seat count and host controls
      // update as soon as someone claims a seat, even before their WebSocket finishes joining.
      this.broadcast.broadcastSnapshot(newState);
      return json({ ok: true, seatIndex: newState.players[body.userId].seatIndex });
    }

    // Game in progress — queue player for the next game
    if (state.phase === 'game_over' || state.phase === 'abandoned') {
      return json({ error: 'Table has finished' }, 409);
    }

    const newState: GameState = {
      ...state,
      waitingPlayers: [
        ...state.waitingPlayers,
        { userId: body.userId, displayName: body.displayName, accountId: body.accountId },
      ],
    };
    await this.saveState(newState);

    // Broadcast updated snapshot so existing players see the waiting count
    this.broadcast.broadcastSnapshot(newState);

    return json({ ok: true, waiting: true });
  }

  // ============================================================
  // Internal HTTP: /internal/add-bot
  // ============================================================

  private async handleAddBot(request: Request): Promise<Response> {
    const body = (await request.json()) as AddBotPayload;
    const state = await this.loadState();

    if (!state) return json({ error: 'Table not found' }, 404);
    if (state.phase !== 'waiting_for_players') {
      return json({ error: 'Cannot add bots after game has started' }, 409);
    }

    const count = Math.max(1, Math.min(body.count ?? 1, DEFAULTS.MAX_PLAYERS - state.seatOrder.length));
    let current = state;

    for (let i = 0; i < count; i++) {
      if (current.seatOrder.length >= current.settings.maxPlayers) break;

      // Pick a unique bot ID and name
      const existingBotCount = Object.values(current.players).filter(p => p.isBot).length;
      const botId = `bot_${current.tableId}_${existingBotCount}`;
      const botName = DEFAULTS.BOT_NAMES[existingBotCount % DEFAULTS.BOT_NAMES.length];

      current = addPlayer(current, {
        userId: botId,
        displayName: botName,
        accountId: 0,
        isBot: true,
      });
    }

    await this.saveState(current);

    // Notify connected players
    this.broadcast.broadcastSnapshot(current);

    // Auto-start if enough real+bot players are now present
    if (this.canAutoStartWaitingTable(current)) {
      await this.autoStart(current);
    }

    return json({ ok: true, addedCount: count });
  }

  // ============================================================
  // Bot play — called by alarm when it's a bot's turn
  // ============================================================

  private async handleBotPlay(state: GameState): Promise<void> {
    const playerId = state.seatOrder[state.currentTurnIndex];
    const player = state.players[playerId];

    this.hydrateBroadcastMap();

    if (state.phase === 'player_turn_discard') {
      // Call Yaniv if possible
      if (handTotal(player.hand) <= state.settings.yanivThreshold) {
        await this.executeBotYaniv(playerId, state);
        return;
      }

      // Pick best discard
      const cards = selectBotDiscard(player.hand);
      const newState = applyDiscard(state, playerId, cards);
      await this.saveState(newState);
      await this.setAlarm(newState);

      const opponentCardCounts: Record<string, number> = {};
      for (const [pid, p] of Object.entries(newState.players)) {
        if (pid !== playerId) opponentCardCounts[pid] = p.hand.length;
      }

      const delta: TurnDeltaMessage = {
        type: 'turn_delta',
        actingUserId: playerId,
        action: 'discard',
        discardedCards: cards,
        drawnSource: null,
        newDiscardPile: { currentSet: newState.discardPile.currentSet, deckCount: newState.deck.length },
        nextTurnUserId: playerId,
        turnDeadlineEpoch: newState.turnDeadlineEpoch!,
        opponentCardCounts,
        myNewCard: null,
        myHand: null,
      };
      this.broadcast.broadcastAll(delta);

    } else if (state.phase === 'player_turn_draw') {
      // Bot always draws from deck
      const { newState, drawnCard, isHadabaka } = applyDraw(state, playerId, 'deck');

      if (isHadabaka) {
        // Bot always accepts הדבקה immediately
        const afterAccept = applyHadabakaAccept(newState, playerId);
        await this.saveState(afterAccept);
        await this.setAlarm(afterAccept);
        this.broadcast.broadcastSnapshot(afterAccept);
        return;
      }

      await this.saveState(newState);
      await this.setAlarm(newState);

      const nextTurnUserId = newState.seatOrder[newState.currentTurnIndex];
      const opponentCardCounts: Record<string, number> = {};
      for (const [pid, p] of Object.entries(newState.players)) {
        if (pid !== playerId) opponentCardCounts[pid] = p.hand.length;
      }

      for (const recipientId of this.broadcast.connectedUserIds()) {
        const isDrawer = recipientId === playerId;
        const delta: TurnDeltaMessage = {
          type: 'turn_delta',
          actingUserId: playerId,
          action: 'draw',
          discardedCards: null,
          drawnSource: 'deck',
          newDiscardPile: { currentSet: newState.discardPile.currentSet, deckCount: newState.deck.length },
          nextTurnUserId,
          turnDeadlineEpoch: newState.turnDeadlineEpoch!,
          opponentCardCounts,
          myNewCard: isDrawer ? drawnCard : null,
          myHand: isDrawer ? newState.players[playerId].hand : null,
        };
        this.broadcast.sendTo(recipientId, delta);
      }
    }
  }

  /** Bot calling Yaniv (reuses existing call_yaniv logic). */
  private async executeBotYaniv(playerId: string, state: GameState): Promise<void> {
    const yanivState = applyYanivCall(state, playerId);
    const allHands: Record<string, CardId[]> = {};
    for (const [id, p] of Object.entries(yanivState.players)) {
      if (!p.isEliminated) allHands[id] = p.hand;
    }

    this.broadcast.broadcastAll({
      type: 'yaniv_called',
      callerId: playerId,
      allHands,
      callerTotal: handTotal(state.players[playerId].hand),
    });

    const { newState, resolution, isMatchOver, winnerId } = applyRoundResolution(yanivState);
    const persistedState = this.pauseIfNeededAfterRound(newState, playerId);
    await this.saveState(persistedState);
    await this.ctx.storage.deleteAlarm();

    const handsRevealed: RoundResultMessage['handsRevealed'] = {};
    for (const [id, hand] of Object.entries(allHands)) {
      handsRevealed[id] = { cards: hand, total: handTotal(hand) };
    }

    this.broadcast.broadcastAll({
      type: 'round_result',
      callType: resolution.isAssaf ? 'assaf' : 'yaniv',
      callerId: playerId,
      assafByIds: resolution.assafPlayerIds,
      handsRevealed,
      scoreDeltas: resolution.scoreDeltas,
      penaltyApplied: resolution.isAssaf,
      newScores: resolution.newScores,
      eliminatedThisRound: resolution.eliminatedPlayerIds,
      scoreResetApplied: resolution.resetPlayerIds,
      nextRoundStartsIn: isMatchOver ? 0 : DEFAULTS.BETWEEN_ROUNDS_DELAY_MS,
    });

    if (persistedState.pauseState) {
      this.broadcast.broadcastSnapshot(persistedState);
    }

    if (isMatchOver) {
      await this.concludeMatch(persistedState, winnerId);
    } else if (!persistedState.pauseState) {
      await this.setAlarm(persistedState);
    }
  }

  // ============================================================
  // Internal HTTP: /internal/remove-player
  // ============================================================

  private async handleRemovePlayer(request: Request): Promise<Response> {
    const { userId } = (await request.json()) as { userId: string };
    const state = await this.loadState();

    if (!state) return json({ error: 'Table not found' }, 404);
    if (state.phase !== 'waiting_for_players') {
      return json({ error: 'Cannot leave after game has started' }, 409);
    }
    if (!state.players[userId]) return json({ ok: true, notFound: true });

    const newState = removePlayer(state, userId);
    await this.saveState(newState);

    // Close any open WebSocket for this user
    for (const ws of this.ctx.getWebSockets()) {
      if (this.ctx.getTags(ws)[0] === userId) {
        try { ws.close(1000, 'left'); } catch { /* ignore */ }
      }
    }
    this.broadcast.remove(userId);

    this.broadcast.broadcastSnapshot(newState);
    return json({ ok: true });
  }

  // ============================================================
  // Internal HTTP: /internal/status
  // ============================================================

  private async handleStatus(): Promise<Response> {
    const state = await this.loadState();
    if (!state) return json({ status: 'not_found' }, 404);
    return json({
      status: state.phase,
      playerCount: state.seatOrder.length,
      waitingCount: state.waitingPlayers.length,
      maxPlayers: state.settings.maxPlayers,
      roundNumber: state.roundNumber,
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async markDisconnected(userId: string): Promise<void> {
    const state = await this.loadState();
    if (!state?.players[userId]) return;

    const updatedState = patchPlayer(state, userId, { isConnected: false });
    const finalState = this.shouldPauseForMissingHumans(updatedState)
      ? pauseGame(updatedState, userId, 'disconnect')
      : updatedState;
    await this.saveState(finalState);
    await this.setAlarm(finalState);

    this.broadcast.broadcastAll({
      type: 'presence',
      userId,
      connected: false,
      reconnectWindowMs: DEFAULTS.RECONNECT_WINDOW_MS,
    });

    if (finalState.pauseState) {
      this.broadcast.broadcastSnapshot(finalState);
    }
  }

  private async loadState(): Promise<GameState | null> {
    if (this.cached) return this.cached;
    const stored = await this.ctx.storage.get<GameState>('gameState');
    this.cached = stored ?? null;
    return this.cached;
  }

  private async saveState(state: GameState): Promise<void> {
    this.cached = state;
    await this.ctx.storage.put('gameState', state);
  }

  private async setAlarm(state: GameState): Promise<void> {
    if (state.pauseState) {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const currentPlayerId = state.seatOrder[state.currentTurnIndex];
    const isBot = state.players[currentPlayerId]?.isBot;

    if (
      isBot &&
      (state.phase === 'player_turn_discard' || state.phase === 'player_turn_draw')
    ) {
      // Bot acts after a short "think" delay
      await this.ctx.storage.setAlarm(Date.now() + DEFAULTS.BOT_THINK_MS);
    } else if (state.turnDeadlineEpoch) {
      await this.ctx.storage.setAlarm(state.turnDeadlineEpoch);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    try {
      ws.send(JSON.stringify({ type: 'error', code, message }));
    } catch { /* ignore */ }
  }

  private canAutoStartWaitingTable(state: GameState): boolean {
    if (state.phase !== 'waiting_for_players') return false;

    const connectedPlayers = Object.values(state.players).filter((p) => p.isConnected).length;
    const connectedHumans = Object.values(state.players).filter((p) => !p.isBot && p.isConnected).length;
    const hasBot = Object.values(state.players).some((p) => p.isBot);

    return connectedPlayers >= DEFAULTS.MIN_PLAYERS && (!hasBot || connectedHumans > 0);
  }

  private shouldPauseForMissingHumans(
    state: GameState,
    absentUserId?: string,
  ): boolean {
    if (state.pauseState) return false;
    if (
      state.phase === 'waiting_for_players' ||
      state.phase === 'yaniv_called' ||
      state.phase === 'game_over' ||
      state.phase === 'abandoned'
    ) {
      return false;
    }

    const hasBot = Object.values(state.players).some((p) => p.isBot);
    const hasHuman = Object.values(state.players).some((p) => !p.isBot);
    if (!hasBot || !hasHuman) return false;

    const connectedHumans = Object.values(state.players).filter(
      (p) => !p.isBot && p.isConnected && p.userId !== absentUserId,
    ).length;

    return connectedHumans === 0;
  }

  private pauseIfNeededAfterRound(
    state: GameState,
    fallbackUserId: string,
  ): GameState {
    if (!this.shouldPauseForMissingHumans(state)) return state;
    return pauseGame(state, this.pickPauseOwnerId(state, fallbackUserId), 'disconnect');
  }

  private pickPauseOwnerId(state: GameState, fallbackUserId: string): string {
    return state.seatOrder.find((userId) => !state.players[userId]?.isBot) ?? fallbackUserId;
  }
}

// ============================================================
// Utilities
// ============================================================

function patchPlayer(
  state: GameState,
  userId: string,
  patch: Partial<GameState['players'][string]>,
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [userId]: { ...state.players[userId], ...patch },
    },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
