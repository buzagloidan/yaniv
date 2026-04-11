import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LobbyPage } from './components/lobby/LobbyPage';
import { GamePage } from './components/game/GamePage';
import { installAudioUnlock } from './utils/soundManager';
import { identifyUser, resetAnalyticsUser } from './analytics';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const user = useAuthStore((s) => s.user);

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
