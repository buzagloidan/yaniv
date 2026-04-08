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

/** Returns all waiting + in_progress tables (shown in lobby). */
export async function getActiveTables(db: D1Database): Promise<TableRow[]> {
  const result = await db
    .prepare(
      `SELECT t.*, u.display_name AS host_name,
              (SELECT COUNT(*) FROM table_players tp WHERE tp.table_id = t.id) AS player_count
       FROM tables t
       JOIN users u ON u.id = t.host_id
       WHERE t.status IN ('waiting', 'in_progress')
       ORDER BY t.created_at ASC
       LIMIT 50`,
    )
    .all<TableRow & { player_count: number }>();
  return result.results;
}

/** Count of non-finished tables (used to know how many public tables to seed). */
export async function countActiveTables(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS cnt FROM tables WHERE status IN ('waiting','in_progress')")
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

/** Ensure the system user exists (hosts public tables). */
export async function ensureSystemUser(db: D1Database): Promise<void> {
  await db
    .prepare(
      'INSERT OR IGNORE INTO users (id, account_id, display_name, created_at, last_seen_at) VALUES (?, 0, ?, 0, 0)',
    )
    .bind('system_yaniv', 'מערכת')
    .run();
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
  extra: { startedAt?: number; finishedAt?: number; winnerId?: string } = {},
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
