import { create } from 'zustand';
import { signInWithApple as apiSignIn, devSignIn as apiDevSignIn, signOut as apiSignOut } from '../networking/api';

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
  signInWithApple: (identityToken: string, displayName?: string) => Promise<void>;
  /** Dev-mode bypass: exchange a fake token so you can test without Apple ID */
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

  signInWithApple: async (identityToken, displayName) => {
    set({ loading: true, error: null });
    try {
      const data = await apiSignIn(identityToken, displayName);
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

  /**
   * Dev-mode sign-in: sends a fake identity token.
   * The backend must be running with a dev-mode auth bypass OR this can be
   * swapped for a real token during testing. Remove before production.
   */
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
