import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore, selectIsMyTurn, selectMe, selectIsWaitingPlayer } from '../../store/gameStore';
import { he } from '../../strings/he';
import { leaveTable } from '../../networking/api';
import { RulesModal } from '../ui/RulesModal';
import { PlayerHand } from './PlayerHand';
import { DiscardPile } from './DiscardPile';
import { OpponentSeat } from './OpponentSeat';
import { ActionBar } from './ActionBar';
import { ScoreBoard } from './ScoreBoard';
import { Chat } from './Chat';
import { RoundResultOverlay } from './RoundResultOverlay';
import { GameOverOverlay } from './GameOverOverlay';
import { ToastContainer } from '../ui/Toast';

function opponentPositions(count: number): Array<{ top: string; left?: string; right?: string; transform?: string }> {
  if (count === 1) return [{ top: '2%', left: '50%', transform: 'translateX(-50%)' }];
  if (count === 2) return [
    { top: '2%', left: '25%' },
    { top: '2%', right: '25%' },
  ];
  if (count === 3) return [
    { top: '2%', left: '15%' },
    { top: '2%', left: '50%', transform: 'translateX(-50%)' },
    { top: '2%', right: '15%' },
  ];
  return [
    { top: '20%', left: '2%' },
    { top: '2%', left: '25%' },
    { top: '2%', right: '25%' },
    { top: '20%', right: '2%' },
  ];
}

/* Tropical palm silhouette corners */
function CornerPalm({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className="absolute bottom-0 pointer-events-none"
      style={{
        [side]: 0,
        width: 100,
        height: 220,
        opacity: 0.18,
        transform: side === 'right' ? 'scaleX(-1)' : undefined,
      }}
    >
      <svg viewBox="0 0 80 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M40 195 Q36 155 38 120 Q36 90 40 65 Q42 90 46 120 Q44 155 44 195Z" fill="#5C3D11" />
        <path d="M40 72 Q12 44 2 14 Q20 42 38 54Z" fill="#166534" />
        <path d="M40 72 Q70 39 82 12 Q64 40 44 54Z" fill="#166534" />
        <path d="M40 72 Q32 32 40 2 Q44 32 44 54Z" fill="#14532D" />
        <path d="M40 72 Q8 58 2 42 Q20 56 38 62Z" fill="#16A34A" />
        <path d="M40 72 Q74 54 82 42 Q64 56 44 62Z" fill="#16A34A" />
        <path d="M40 72 Q16 74 4 66 Q20 70 38 68Z" fill="#22C55E" />
        <path d="M40 72 Q62 74 78 66 Q62 70 44 68Z" fill="#22C55E" />
      </svg>
    </div>
  );
}

/* Subtle ocean border at the very bottom */
function OceanStrip() {
  return (
    <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{ height: 28, zIndex: 1 }}>
      <svg viewBox="0 0 1440 28" preserveAspectRatio="none" className="w-full h-full">
        <path d="M0,14 C240,28 480,0 720,14 C960,28 1200,4 1440,14 L1440,28 L0,28Z" fill="#7DD3FC" opacity="0.4" />
        <path d="M0,20 C180,10 360,26 540,20 C720,14 900,24 1080,20 C1260,16 1380,22 1440,18 L1440,28 L0,28Z" fill="#38BDF8" opacity="0.3" />
      </svg>
    </div>
  );
}

export function GamePage() {
  const { tableId } = useParams<{ tableId: string }>();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('code') ?? '';
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const connect = useGameStore((s) => s.connect);
  const disconnect = useGameStore((s) => s.disconnect);
  const connectionState = useGameStore((s) => s.connectionState);
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const currentTurnUserId = useGameStore((s) => s.currentTurnUserId);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const me = useGameStore(selectMe);
  const isWaitingPlayer = useGameStore(selectIsWaitingPlayer);

  useEffect(() => {
    if (!tableId || !user) { navigate('/'); return; }
    connect(tableId, roomCode, user.sessionToken, user.userId);
    return () => { disconnect(); };
  }, [tableId]);

  const [leaving, setLeaving] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  async function handleLeaveTable() {
    if (!user || !roomCode || leaving) return;
    setLeaving(true);
    try {
      await leaveTable(user.sessionToken, roomCode);
    } catch {
      // ignore — navigate away regardless
    }
    disconnect();
    navigate('/');
  }

  const opponents = players.filter((p) => p.userId !== user?.userId);
  const positions = opponentPositions(opponents.length);
  const isWaiting = phase === 'waiting_for_players' || !phase;

  return (
    <div className="felt relative w-full h-screen overflow-hidden select-none">
      {/* Palm corner decorations */}
      <CornerPalm side="left" />
      <CornerPalm side="right" />
      <OceanStrip />

      {/* Rules button */}
      <button
        onClick={() => setRulesOpen(true)}
        className="absolute top-3 z-20 flex items-center justify-center rounded-full text-sm font-bold shadow-md transition-transform hover:scale-105"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          width: 32,
          height: 32,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(8px)',
          color: '#0891B2',
          border: '1.5px solid rgba(8,145,178,0.35)',
        }}
        title="חוקי המשחק"
      >
        ?
      </button>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* Connection banner */}
      <AnimatePresence>
        {connectionState === 'reconnecting' && (
          <motion.div
            initial={{ y: -40 }}
            animate={{ y: 0 }}
            exit={{ y: -40 }}
            className="absolute top-0 inset-x-0 z-30 text-white text-center text-sm py-2 font-medium"
            style={{ background: 'linear-gradient(90deg, #F26419, #D9560E)' }}
          >
            {he.game.reconnecting}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scoreboard */}
      <ScoreBoard />

      {/* Chat */}
      <Chat />

      {/* ── Waiting room overlay (before game starts) ── */}
      <AnimatePresence>
        {isWaiting && !isWaitingPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
          >
            {/* Frosted glass panel */}
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center px-8 py-8 mx-4 rounded-3xl max-w-xs w-full"
              style={{
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(14, 116, 144, 0.22)',
                border: '1px solid rgba(255,255,255,0.95)',
              }}
            >
              {/* Animated logo */}
              <motion.img
                src="/yaniv-logo.png"
                alt="יניב"
                className="w-16 h-16 object-contain mx-auto mb-3"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              <p
                className="text-lg font-semibold mb-1"
                style={{ color: '#1A3352', fontFamily: 'Syne, sans-serif' }}
              >
                {he.game.waitingForPlayers}
              </p>
              <p className="text-sm mb-4" style={{ color: '#7C6A50' }}>
                ממתינים לשחקן נוסף... 🌴
              </p>

              {roomCode && (
                <div
                  className="rounded-2xl px-4 py-3 mb-5 flex flex-col items-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)' }}
                >
                  <span className="text-xs font-medium" style={{ color: '#0E7490' }}>קוד חדר</span>
                  <span
                    className="text-3xl font-bold tracking-widest"
                    style={{ color: '#0E7490', fontFamily: 'Syne, sans-serif' }}
                  >
                    {roomCode}
                  </span>
                </div>
              )}
              <ActionBar />

              <button
                onClick={handleLeaveTable}
                disabled={leaving}
                className="mt-3 w-full py-2 rounded-2xl text-sm font-medium transition-opacity"
                style={{
                  background: 'rgba(242,100,25,0.1)',
                  color: '#D9560E',
                  border: '1px solid rgba(242,100,25,0.25)',
                  opacity: leaving ? 0.5 : 1,
                }}
              >
                {leaving ? 'עוזב...' : 'עזוב שולחן'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mid-game waiting overlay ── */}
      <AnimatePresence>
        {isWaitingPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              className="text-center px-8 py-8 mx-4 rounded-3xl max-w-xs w-full"
              style={{
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(14, 116, 144, 0.2)',
                border: '1px solid rgba(255,255,255,0.95)',
              }}
            >
              <motion.div
                className="text-4xl mb-3"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                🏖
              </motion.div>
              <p
                className="text-lg font-semibold mb-2"
                style={{ color: '#1A3352', fontFamily: 'Syne, sans-serif' }}
              >
                ממתין למשחק הבא
              </p>
              <p className="text-sm mb-5" style={{ color: '#7C6A50' }}>
                תצטרף לסיבוב הבא ברגע שהמשחק הנוכחי יסתיים 🌊
              </p>
              <button
                onClick={() => { disconnect(); navigate('/'); }}
                className="w-full py-2 rounded-2xl text-sm font-medium"
                style={{
                  background: 'rgba(242,100,25,0.1)',
                  color: '#D9560E',
                  border: '1px solid rgba(242,100,25,0.25)',
                }}
              >
                עזוב שולחן
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Opponents around table ── */}
      {!isWaiting && !isWaitingPlayer && opponents.map((opponent, i) => (
        <div
          key={opponent.userId}
          className="absolute"
          style={positions[i] ?? { top: '5%', left: '5%' }}
        >
          <OpponentSeat
            player={opponent}
            isCurrentTurn={currentTurnUserId === opponent.userId}
          />
        </div>
      ))}

      {/* ── Turn indicator ── */}
      {!isWaiting && !isWaitingPlayer && (
        <div className="absolute top-1/3 inset-x-0 flex justify-center pointer-events-none z-10">
          <AnimatePresence>
            {isMyTurn && phase === 'player_turn_discard' && (
              <motion.div
                key="my-turn"
                initial={{ opacity: 0, scale: 0.7, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="px-5 py-2 rounded-full font-bold text-sm shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #F26419, #D9560E)',
                  color: 'white',
                  fontFamily: 'Syne, sans-serif',
                  boxShadow: '0 4px 20px rgba(242,100,25,0.45)',
                }}
              >
                {he.game.yourTurn} 🌟
              </motion.div>
            )}
            {!isMyTurn && currentTurnUserId && (
              <motion.div
                key="their-turn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(255,255,255,0.65)',
                  backdropFilter: 'blur(8px)',
                  color: '#2D4F7C',
                  border: '1px solid rgba(226,201,154,0.5)',
                }}
              >
                {he.game.waitingFor(
                  players.find((p) => p.userId === currentTurnUserId)?.displayName ?? '...',
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Center: discard + draw pile ── */}
      {!isWaiting && !isWaitingPlayer && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <DiscardPile />
          </div>
        </div>
      )}

      {/* ── My hand + action bar ── */}
      {!isWaiting && !isWaitingPlayer && (
        <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-4 px-4" style={{ zIndex: 5 }}>
          <ActionBar />
          <PlayerHand />
          {me && (
            <div
              className="px-4 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                color: '#2D4F7C',
                border: '1px solid rgba(226,201,154,0.5)',
              }}
            >
              {me.displayName} · {me.score} נק׳
            </div>
          )}
        </div>
      )}

      {/* Overlays */}
      <RoundResultOverlay />
      <GameOverOverlay />
      <ToastContainer />
    </div>
  );
}
