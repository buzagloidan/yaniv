import { create } from 'zustand';
import { devSignIn as apiDevSignIn, signOut as apiSignOut } from '../networking/api';

interface AuthUser {
  userId: string;
  displayName: string;
  accountId: number;
  sessionToken: string;
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

function loadStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
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
