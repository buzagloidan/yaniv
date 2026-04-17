import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LobbyPage } from './components/lobby/LobbyPage';
import { GamePage } from './components/game/GamePage';
import { installAudioUnlock } from './utils/soundManager';
import { identifyUser, resetAnalyticsUser, trackEvent } from './analytics';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const initialUserIdRef = useRef(user?.userId ?? null);
  const trackedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    installAudioUnlock();
  }, []);

  useEffect(() => {
    if (user) {
      identifyUser(user.userId, user.displayName);
    } else {
      resetAnalyticsUser();
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      trackedUserIdRef.current = null;
      return;
    }

    if (trackedUserIdRef.current === user.userId) {
      return;
    }

    const restoredSession = initialUserIdRef.current === user.userId;
    trackEvent('user_signed_in', {
      method: 'dev',
      restored_session: restoredSession,
    });
    trackEvent('player_active', {
      source: restoredSession ? 'session_restore' : 'fresh_sign_in',
    });
    trackedUserIdRef.current = user.userId;
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route
          path="/game/:tableId"
          element={
            <RequireAuth>
              <GamePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
