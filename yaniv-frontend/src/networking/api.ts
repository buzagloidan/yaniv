import type { GameSettings } from '../shared/types';

const BASE = import.meta.env.VITE_API_URL ?? '';

/** Called when any request returns 401 — clears the stale session so NicknameGate re-appears. */
function handleUnauthorized() {
  localStorage.removeItem('yaniv_session');
  // Dynamically import to avoid a circular dependency at module load time
  import('../store/authStore').then(({ useAuthStore }) => {
    useAuthStore.setState({ user: null });
  });
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status}`);
  }
  if (res.status === 401) {
    handleUnauthorized();
  }
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json as T;
}

// ── Auth ─────────────────────────────────────────────────────

export async function devSignIn(
  displayName: string,
): Promise<{ sessionToken: string; userId: string; displayName: string; accountId: number }> {
  return request('/auth/dev', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
}

export async function signOut(token: string): Promise<void> {
  await request('/auth/session', { method: 'DELETE' }, token);
}

// ── Lobby ────────────────────────────────────────────────────

export async function createTable(
  token: string,
  settings: Partial<Pick<GameSettings, 'maxPlayers' | 'yanivThreshold' | 'scoreLimit'>> & { isPrivateTable?: boolean },
): Promise<{ tableId: string; roomCode: string }> {
  return request('/tables', { method: 'POST', body: JSON.stringify(settings) }, token);
}

export async function addBot(
  token: string,
  roomCode: string,
  count: number,
): Promise<{ ok: boolean }> {
  return request(`/tables/${roomCode}/add-bot`, { method: 'POST', body: JSON.stringify({ count }) }, token);
}

export async function joinTable(
  token: string,
  roomCode: string,
): Promise<{ tableId: string; roomCode: string }> {
  return request(`/tables/${roomCode}/join`, { method: 'POST' }, token);
}

export async function leaveTable(
  token: string,
  roomCode: string,
): Promise<{ ok: boolean }> {
  return request(`/tables/${roomCode}/leave`, { method: 'POST' }, token);
}

export async function leaveTableById(
  token: string,
  tableId: string,
): Promise<{ ok: boolean }> {
  return request(`/tables/id/${tableId}/leave`, { method: 'POST' }, token);
}

export async function createWsTicket(
  token: string,
  tableId: string,
): Promise<{ ticket: string }> {
  return request(`/game/${tableId}/ws-ticket`, { method: 'POST' }, token);
}
