-- Users (created/updated on first Apple Sign-In)
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,        -- Apple subject identifier (stable opaque)
  account_id   INTEGER NOT NULL UNIQUE, -- Sequential display ID, e.g. YanivID42
  display_name TEXT NOT NULL,           -- UTF-8 Hebrew or fallback "YanivID{n}"
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

-- Active and historical game tables
CREATE TABLE IF NOT EXISTS tables (
  id                   TEXT PRIMARY KEY,
  room_code            TEXT NOT NULL UNIQUE,
  host_id              TEXT NOT NULL REFERENCES users(id),
  status               TEXT NOT NULL CHECK(status IN ('waiting','in_progress','finished','cancelled')),
  max_players          INTEGER NOT NULL DEFAULT 4,
  yaniv_threshold      INTEGER NOT NULL DEFAULT 7,
  turn_timeout_seconds INTEGER NOT NULL DEFAULT 30,
  is_ranked            INTEGER NOT NULL DEFAULT 0, -- SQLite boolean
  created_at           INTEGER NOT NULL,
  started_at           INTEGER,
  finished_at          INTEGER,
  winner_id            TEXT REFERENCES users(id)
);

-- Per-player records for each table (seat assignments, final results)
CREATE TABLE IF NOT EXISTS table_players (
  table_id    TEXT NOT NULL REFERENCES tables(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  seat_index  INTEGER NOT NULL,
  joined_at   INTEGER NOT NULL,
  final_score INTEGER,
  placement   INTEGER,   -- 1 = winner, 2 = second, etc.
  PRIMARY KEY (table_id, user_id)
);

-- Durable match history; tables above are reused/reset, these rows are append-only archives
CREATE TABLE IF NOT EXISTS matches (
  id                   TEXT PRIMARY KEY,
  table_id             TEXT NOT NULL REFERENCES tables(id),
  room_code            TEXT NOT NULL,
  host_id              TEXT NOT NULL REFERENCES users(id),
  started_at           INTEGER,
  finished_at          INTEGER NOT NULL,
  winner_id            TEXT REFERENCES users(id),
  winner_name          TEXT NOT NULL,
  winner_is_bot        INTEGER NOT NULL DEFAULT 0,
  is_ranked            INTEGER NOT NULL DEFAULT 0,
  max_players          INTEGER NOT NULL,
  yaniv_threshold      INTEGER NOT NULL,
  turn_timeout_seconds INTEGER NOT NULL,
  score_limit          INTEGER NOT NULL,
  reset_score_at       INTEGER NOT NULL,
  round_count          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id        TEXT NOT NULL REFERENCES matches(id),
  participant_id  TEXT NOT NULL,
  user_id         TEXT REFERENCES users(id),
  display_name    TEXT NOT NULL,
  account_id      INTEGER,
  seat_index      INTEGER NOT NULL,
  is_bot          INTEGER NOT NULL DEFAULT 0,
  final_score     INTEGER NOT NULL,
  placement       INTEGER NOT NULL,
  was_eliminated  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, participant_id)
);

-- KV-style counter for account IDs (single row)
CREATE TABLE IF NOT EXISTS counters (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO counters (key, value) VALUES ('next_account_id', 0);

CREATE INDEX IF NOT EXISTS idx_tables_status    ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_room_code ON tables(room_code);
CREATE INDEX IF NOT EXISTS idx_tp_table         ON table_players(table_id);
CREATE INDEX IF NOT EXISTS idx_matches_table    ON matches(table_id);
CREATE INDEX IF NOT EXISTS idx_matches_finished ON matches(finished_at);
CREATE INDEX IF NOT EXISTS idx_mp_match         ON match_players(match_id);
