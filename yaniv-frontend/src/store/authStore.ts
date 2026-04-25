import { create } from 'zustand';
import { devSignIn as apiDevSignIn, signOut as apiSignOut } from '../networking/api';

interface AuthUser {
  userId: string;
  displayName: string;
  accountId: number;
  sessionToken: string;
}

interface StoredAuthUser extends AuthUser {
  expiresAt?: number;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  devSignIn: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEY = 'yaniv_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function isStoredAuthUser(value: unknown): value is StoredAuthUser {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<StoredAuthUser>;
  return (
    typeof candidate.userId === 'string' && candidate.userId.trim().length > 0
    && typeof candidate.displayName === 'string' && candidate.displayName.trim().length > 0
    && typeof candidate.accountId === 'number' && Number.isFinite(candidate.accountId)
    && typeof candidate.sessionToken === 'string' && candidate.sessionToken.trim().length > 0
    && (candidate.expiresAt === undefined || Number.isFinite(candidate.expiresAt))
  );
}

function loadStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredAuthUser(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      userId: parsed.userId,
      displayName: parsed.displayName,
      accountId: parsed.accountId,
      sessionToken: parsed.sessionToken,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: loadStored(),
  loading: false,
  error: null,

  devSignIn: async (displayName) => {
    set({ loading: true, error: null });
    try {
      const data = await apiDevSignIn(displayName);
      const user: AuthUser = {
        userId: data.userId,
        displayName: data.displayName,
        accountId: data.accountId,
        sessionToken: data.sessionToken,
      };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...user, expiresAt: Date.now() + SESSION_TTL_MS }),
      );
      set({ user, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  signOut: async () => {
    const { user } = get();
    if (user) {
      await apiSignOut(user.sessionToken).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
