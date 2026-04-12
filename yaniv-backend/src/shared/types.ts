import type { GameSettings } from '../../../shared/protocol';

export * from '../../../shared/protocol';

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
  ANALYTICS: AnalyticsEngineDataset;
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
  count: number;
}

export interface InitTablePayload {
  tableId: string;
  roomCode: string;
  hostId: string;
  isPrivateTable?: boolean;
  hostDisplayName: string;
  hostAccountId: number;
  settings: GameSettings;
}
