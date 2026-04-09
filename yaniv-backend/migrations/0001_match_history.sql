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

CREATE INDEX IF NOT EXISTS idx_matches_table    ON matches(table_id);
CREATE INDEX IF NOT EXISTS idx_matches_finished ON matches(finished_at);
CREATE INDEX IF NOT EXISTS idx_mp_match         ON match_players(match_id);
