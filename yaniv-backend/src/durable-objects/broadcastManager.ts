import type {
  GameState,
  ServerMessage,
  StateSnapshotMessage,
  PublicPlayerInfo,
  PublicDiscardPile,
} from '../shared/types';

// ============================================================
// BroadcastManager
// Owns the live WebSocket map for a single GameTable instance.
// ============================================================

export class BroadcastManager {
  // userId → WebSocket (hibernatable WebSockets obtained from DO state at runtime)
  private sockets = new Map<string, WebSocket>();

  add(userId: string, ws: WebSocket): void {
    this.sockets.set(userId, ws);
  }

  remove(userId: string): void {
    this.sockets.delete(userId);
  }

  has(userId: string): boolean {
    return this.sockets.has(userId);
  }

  connectedUserIds(): string[] {
    return [...this.sockets.keys()];
  }

  sendTo(userId: string, msg: ServerMessage): void {
    const ws = this.sockets.get(userId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Socket may have already closed; ignore
    }
  }

  broadcastAll(msg: ServerMessage): void {
    const json = JSON.stringify(msg);
    for (const ws of this.sockets.values()) {
      try {
        ws.send(json);
      } catch {
        // Ignore stale sockets
      }
    }
  }

  /**
   * Send a personalised StateSnapshotMessage to every connected player.
   * Each player receives only their own hand; all other data is public.
   */
  broadcastSnapshot(state: GameState): void {
    for (const [userId, ws] of this.sockets.entries()) {
      try {
        ws.send(JSON.stringify(buildSnapshot(state, userId)));
      } catch {
        // Ignore
      }
    }
  }
}

// ============================================================
// Build a personalised snapshot for one player
// ============================================================

export function buildSnapshot(state: GameState, forUserId: string): StateSnapshotMessage {
  const players: PublicPlayerInfo[] = state.seatOrder.map((userId) => {
    const p = state.players[userId];
    return {
      userId: p.userId,
      displayName: p.displayName,
      seatIndex: p.seatIndex,
      cardCount: p.hand.length,
      score: p.score,
      isConnected: p.isConnected,
      isEliminated: p.isEliminated,
      isBot: p.isBot,
    };
  });

  const discardPile: PublicDiscardPile = {
    currentSet: state.discardPile.currentSet,
    deckCount: state.deck.length,
  };

  const myHand = state.players[forUserId]?.hand ?? [];

  // hadabakaCard is only revealed to the player whose turn it is
  const currentPlayerId = state.seatOrder[state.currentTurnIndex];
  const hadabakaCard =
    state.phase === 'player_turn_hadabaka' && forUserId === currentPlayerId
      ? (state.hadabakaCard ?? null)
      : null;

  return {
    type: 'state_snapshot',
    tableId: state.tableId,
    hostId: state.hostId,
    isPrivateTable: state.isPrivateTable,
    maxPlayers: state.settings.maxPlayers,
    phase: state.phase,
    roundNumber: state.roundNumber,
    currentTurnUserId: state.phase.startsWith('player_turn')
      ? (currentPlayerId ?? null)
      : null,
    turnDeadlineEpoch: state.turnDeadlineEpoch,
    players,
    myHand,
    discardPile,
    waitingPlayerIds: state.waitingPlayers.map((p) => p.userId),
    pauseState: state.pauseState,
    hadabakaCard,
  };
}
