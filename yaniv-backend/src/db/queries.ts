import type { UserRow, TableRow, GameSettings } from '../shared/types';

// ============================================================
// Users
// ============================================================

export async function getUserById(db: D1Database, userId: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>() ?? null;
}

/**
 * Atomically claims the next sequential account ID using D1's serialised writes.
 * Returns the new account ID.
 */
export async function claimNextAccountId(db: D1Database): Promise<number> {
  await db
    .prepare('UPDATE counters SET value = value + 1 WHERE key = ?')
    .bind('next_account_id')
    .run();
  const row = await db
    .prepare('SELECT value FROM counters WHERE key = ?')
    .bind('next_account_id')
    .first<{ value: number }>();
  return row?.value ?? 1;
}

/**
 * Insert a new user or update last_seen_at. Returns the full user row.
 * If the user is new and displayName is empty, falls back to "YanivID{accountId}".
 */
export async function upsertUser(
  db: D1Database,
  appleSub: string,
  displayName: string,
): Promise<UserRow> {
  const existing = await getUserById(db, appleSub);
  const now = Date.now();

  if (existing) {
    await db
      .prepare('UPDATE users SET last_seen_at = ? WHERE id = ?')
      .bind(now, appleSub)
      .run();
    return { ...existing, last_seen_at: now };
  }

  const accountId = await claimNextAccountId(db);
  const finalName = displayName.trim() || `YanivID${accountId}`;

  await db
    .prepare(
      'INSERT INTO users (id, account_id, display_name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(appleSub, accountId, finalName, now, now)
    .run();

  return {
    id: appleSub,
    account_id: accountId,
    display_name: finalName,
    created_at: now,
    last_seen_at: now,
  };
}

// ============================================================
// Tables
// ============================================================

export async function getOpenTables(db: D1Database): Promise<TableRow[]> {
  const result = await db
    .prepare(
      `SELECT t.*, u.display_name AS host_name
       FROM tables t
       JOIN users u ON u.id = t.host_id
       WHERE t.status = 'waiting'
       ORDER BY t.created_at DESC
       LIMIT 50`,
    )
    .all<TableRow>();
  return result.results;
}


export async function getTableByRoomCode(
  db: D1Database,
  roomCode: string,
): Promise<TableRow | null> {
  return (
    (await db
      .prepare('SELECT * FROM tables WHERE room_code = ?')
      .bind(roomCode)
      .first<TableRow>()) ?? null
  );
}

export async function getTableById(db: D1Database, tableId: string): Promise<TableRow | null> {
  return (
    (await db
      .prepare('SELECT * FROM tables WHERE id = ?')
      .bind(tableId)
      .first<TableRow>()) ?? null
  );
}

export async function isRoomCodeTaken(db: D1Database, code: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM tables WHERE room_code = ? AND status IN ('waiting','in_progress')")
    .bind(code)
    .first<{ id: string }>();
  return row !== null;
}

export async function createTable(
  db: D1Database,
  tableId: string,
  roomCode: string,
  hostId: string,
  settings: Pick<GameSettings, 'maxPlayers' | 'yanivThreshold' | 'turnTimeoutSeconds' | 'isRanked'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tables
         (id, room_code, host_id, status, max_players, yaniv_threshold, turn_timeout_seconds, is_ranked, created_at)
       VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?, ?)`,
    )
    .bind(
      tableId,
      roomCode,
      hostId,
      settings.maxPlayers,
      settings.yanivThreshold,
      settings.turnTimeoutSeconds,
      settings.isRanked ? 1 : 0,
      Date.now(),
    )
    .run();
}

export async function updateTableStatus(
  db: D1Database,
  tableId: string,
  status: TableRow['status'],
  extra: { startedAt?: number; finishedAt?: number; winnerId?: string | null } = {},
): Promise<void> {
  const sets: string[] = ['status = ?'];
  const values: (string | number | null)[] = [status];

  if (extra.startedAt !== undefined) {
    sets.push('started_at = ?');
    values.push(extra.startedAt);
  }
  if (extra.finishedAt !== undefined) {
    sets.push('finished_at = ?');
    values.push(extra.finishedAt);
  }
  if (extra.winnerId !== undefined) {
    sets.push('winner_id = ?');
    values.push(extra.winnerId);
  }

  values.push(tableId);
  await db
    .prepare(`UPDATE tables SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function finalizeMatchResults(
  db: D1Database,
  tableId: string,
  finishedAt: number,
  winnerId: string | null,
  playerResults: Array<{ userId: string; finalScore: number; placement: number }>,
): Promise<void> {
  const statements = [
    db
      .prepare(
        'UPDATE tables SET status = ?, finished_at = ?, winner_id = ? WHERE id = ?',
      )
      .bind('finished', finishedAt, winnerId, tableId),
    ...playerResults.map(({ userId, finalScore, placement }) =>
      db
        .prepare(
          'UPDATE table_players SET final_score = ?, placement = ? WHERE table_id = ? AND user_id = ?',
        )
        .bind(finalScore, placement, tableId, userId),
    ),
  ];

  await db.batch(statements);
}

export async function archiveCompletedMatch(
  db: D1Database,
  match: {
    matchId: string;
    tableId: string;
    roomCode: string;
    hostId: string;
    startedAt: number | null;
    finishedAt: number;
    winnerId: string | null;
    winnerName: string;
    winnerIsBot: boolean;
    settings: Pick<
      GameSettings,
      'maxPlayers' | 'yanivThreshold' | 'turnTimeoutSeconds' | 'scoreLimit' | 'resetScoreAt' | 'isRanked'
    >;
    roundCount: number;
    players: Array<{
      participantId: string;
      userId: string | null;
      displayName: string;
      accountId: number | null;
      seatIndex: number;
      isBot: boolean;
      finalScore: number;
      placement: number;
      wasEliminated: boolean;
    }>;
  },
): Promise<void> {
  const statements = [
    db
      .prepare(
        `INSERT INTO matches
           (id, table_id, room_code, host_id, started_at, finished_at, winner_id, winner_name, winner_is_bot,
            is_ranked, max_players, yaniv_threshold, turn_timeout_seconds, score_limit, reset_score_at, round_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        match.matchId,
        match.tableId,
        match.roomCode,
        match.hostId,
        match.startedAt,
        match.finishedAt,
        match.winnerId,
        match.winnerName,
        match.winnerIsBot ? 1 : 0,
        match.settings.isRanked ? 1 : 0,
        match.settings.maxPlayers,
        match.settings.yanivThreshold,
        match.settings.turnTimeoutSeconds,
        match.settings.scoreLimit,
        match.settings.resetScoreAt,
        match.roundCount,
      ),
    ...match.players.map((player) =>
      db
        .prepare(
          `INSERT INTO match_players
             (match_id, participant_id, user_id, display_name, account_id, seat_index, is_bot, final_score, placement, was_eliminated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          match.matchId,
          player.participantId,
          player.userId,
          player.displayName,
          player.accountId,
          player.seatIndex,
          player.isBot ? 1 : 0,
          player.finalScore,
          player.placement,
          player.wasEliminated ? 1 : 0,
        ),
    ),
  ];

  await db.batch(statements);
}

export async function resetTableMetadataForNewGame(
  db: D1Database,
  tableId: string,
  players: Array<{ userId: string; seatIndex: number }>,
): Promise<void> {
  const statements = [
    db.prepare('DELETE FROM table_players WHERE table_id = ?').bind(tableId),
    ...players.map(({ userId, seatIndex }) =>
      db
        .prepare(
          'INSERT INTO table_players (table_id, user_id, seat_index, joined_at) VALUES (?, ?, ?, ?)',
        )
        .bind(tableId, userId, seatIndex, Date.now()),
    ),
    db
      .prepare(
        "UPDATE tables SET status = 'waiting', started_at = NULL, finished_at = NULL, winner_id = NULL WHERE id = ?",
      )
      .bind(tableId),
  ];

  await db.batch(statements);
}

export async function getTablePlayerCount(db: D1Database, tableId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS cnt FROM table_players WHERE table_id = ?')
    .bind(tableId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function addTablePlayer(
  db: D1Database,
  tableId: string,
  userId: string,
  seatIndex: number,
): Promise<void> {
  await db
    .prepare(
      'INSERT OR IGNORE INTO table_players (table_id, user_id, seat_index, joined_at) VALUES (?, ?, ?, ?)',
    )
    .bind(tableId, userId, seatIndex, Date.now())
    .run();
}

/** Remove all player records for a table (called on table reset). */
export async function clearTablePlayers(db: D1Database, tableId: string): Promise<void> {
  await db.prepare('DELETE FROM table_players WHERE table_id = ?').bind(tableId).run();
}

/** Remove a single player from a table. */
export async function removeTablePlayer(
  db: D1Database,
  tableId: string,
  userId: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM table_players WHERE table_id = ? AND user_id = ?')
    .bind(tableId, userId)
    .run();
}

export async function updatePlayerResult(
  db: D1Database,
  tableId: string,
  userId: string,
  finalScore: number,
  placement: number,
): Promise<void> {
  await db
    .prepare(
      'UPDATE table_players SET final_score = ?, placement = ? WHERE table_id = ? AND user_id = ?',
    )
    .bind(finalScore, placement, tableId, userId)
    .run();
}
