import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { createTable, addBot, joinTable } from '../../networking/api';
import { useStrings } from '../../strings';
import { NicknameGate } from '../auth/NicknameGate';
import { RulesModal } from '../ui/RulesModal';
import { CreateTableModal } from './CreateTableModal';
import { JoinTableModal } from './JoinTableModal';
import { SettingsModal } from './SettingsModal';

export function LobbyPage() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quickStarting, setQuickStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = useStrings();
  const token = user?.sessionToken ?? '';

  /** Create a table with 3 bots and navigate straight to the game */
  const handleQuickStart = async () => {
    if (!user) return;
    setError(null);
    setQuickStarting(true);
    try {
      const data = await createTable(token, {
        maxPlayers: 4,
        yanivThreshold: 7,
        scoreLimit: 100,
        isPrivateTable: true,
      });
      await addBot(token, data.roomCode, 3);
      navigate(`/game/${data.tableId}`);
    } catch (e) {
      setError((e as Error).message ?? s.errors.unknown);
      setQuickStarting(false);
    }
  };

  const handleCreate = async (settings: Parameters<typeof createTable>[1]) => {
    if (!user) return;
    const data = await createTable(token, settings);
    navigate(`/game/${data.tableId}?code=${data.roomCode}`);
  };

  const handleJoin = async (code: string) => {
    if (!user) return;
    const data = await joinTable(token, code);
    navigate(`/game/${data.tableId}?code=${data.roomCode}`);
  };

  return (
    <div
      className="h-[100svh] flex flex-col relative overflow-hidden overscroll-none"
      style={{
        background: 'linear-gradient(180deg, #87CEEB 0%, #56B4D3 25%, #0891B2 55%, #E8D5B7 55%, #D4A96A 75%, #C49A50 100%)',
      }}
    >
      {/* Sky decoration */}
      <div className="absolute top-8 right-8 opacity-80">
        <div className="w-16 h-16 rounded-full" style={{ background: 'rgba(255,245,180,0.9)', boxShadow: '0 0 30px 10px rgba(255,235,150,0.4)' }} />
      </div>
      <div className="absolute top-12 right-10 opacity-30">
        <div className="w-8 h-8 rounded-full" style={{ background: 'white' }} />
      </div>

      {/* Clouds */}
      <div className="absolute top-6 left-12 opacity-70">
        <div className="flex gap-1">
          <div className="w-10 h-5 rounded-full bg-white" />
          <div className="w-14 h-7 rounded-full bg-white -ml-3 mt-1" />
          <div className="w-8 h-4 rounded-full bg-white -ml-2" />
        </div>
      </div>

      {/* Header spacer */}
      <header className="relative z-10 px-5 pt-safe pt-4 pb-2" />

      {/* Water wave separator */}
      <div className="relative" style={{ marginTop: 'clamp(0.75rem, 4vh, 10vh)' }}>
        <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="w-full" style={{ height: 40, display: 'block' }}>
          <path d="M0,20 C240,40 480,0 720,20 C960,40 1200,5 1440,20 L1440,40 L0,40Z" fill="rgba(8,145,178,0.35)" />
          <path d="M0,30 C300,10 600,40 900,25 C1100,15 1300,35 1440,22 L1440,40 L0,40Z" fill="rgba(8,145,178,0.25)" />
        </svg>
      </div>

      {/* Main content — sits on the sand */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 pt-4 pb-10 sm:pt-6 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 220, damping: 20 }}
          className="mb-4"
        >
          <img
            src="/yaniv-logo.svg"
            alt="יניב"
            className="w-48 sm:w-56 md:w-64 h-auto object-contain drop-shadow-[0_10px_24px_rgba(12,74,110,0.28)]"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </motion.div>

        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 20 }}
            className="mb-8"
          >
            <div
              className="inline-flex items-center px-5 py-2.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)' }}
            >
              <span
                className="text-sm sm:text-base font-medium text-white drop-shadow"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
              >
                {s.lobby.greeting(user.displayName)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs mb-4 px-4 py-2.5 rounded-xl text-sm text-center"
            style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
          >
            {error}
          </motion.div>
        )}

        {/* Quick start button — main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-xs mb-6"
        >
          <button
            onClick={handleQuickStart}
            disabled={quickStarting}
            className="w-full py-5 rounded-3xl text-xl font-bold transition-all active:scale-95 disabled:opacity-60 relative overflow-hidden"
            style={{
              background: quickStarting
                ? 'linear-gradient(135deg, #C49A28, #8B6914)'
                : 'linear-gradient(135deg, #F26419 0%, #E05210 50%, #C94A0C 100%)',
              color: '#FFFBF0',
              fontFamily: 'Syne, sans-serif',
              boxShadow: quickStarting
                ? 'none'
                : '0 6px 24px rgba(242,100,25,0.45), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.15)',
            }}
          >
            {/* Shimmer */}
            {!quickStarting && (
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
                  animation: 'shimmer 2.5s infinite',
                }}
              />
            )}
            <span className="relative">
              {quickStarting ? `🌴 ${s.lobby.loading}` : `🏄 ${s.game.startGame}`}
            </span>
          </button>

        </motion.div>

        {/* Secondary buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-xs flex flex-col gap-3"
        >
          {/* Join with code */}
          <button
            onClick={() => setShowJoin(true)}
            className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.85)',
              color: '#0C4A6E',
              fontFamily: 'Noto Sans Hebrew, sans-serif',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid rgba(8,145,178,0.2)',
            }}
          >
            <span className="text-lg">🔑</span>
            {s.lobby.joinWithCode}
          </button>

          {/* Create table */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.85)',
              color: '#0C4A6E',
              fontFamily: 'Noto Sans Hebrew, sans-serif',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid rgba(8,145,178,0.2)',
            }}
          >
            <span className="text-lg">🃏</span>
            {s.lobby.createTable}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.85)',
              color: '#0C4A6E',
              fontFamily: 'Noto Sans Hebrew, sans-serif',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid rgba(8,145,178,0.2)',
            }}
          >
            <span className="text-lg">⚙️</span>
            {s.lobby.settings}
          </button>
        </motion.div>
      </div>

      {/* Bottom palm tree decoration */}
      <div className="pointer-events-none fixed bottom-0 inset-x-0 flex justify-between px-4 pb-0 opacity-70">
        <div className="text-6xl" style={{ transform: 'scaleX(-1)', transformOrigin: 'bottom', marginBottom: -8 }}>🌴</div>
        <div className="text-6xl" style={{ transformOrigin: 'bottom', marginBottom: -8 }}>🌴</div>
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <CreateTableModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
      <JoinTableModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={handleJoin}
      />
      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onShowRules={() => setShowRules(true)}
        onSignOut={signOut}
      />
      <NicknameGate open={!user} />
    </div>
  );
}
