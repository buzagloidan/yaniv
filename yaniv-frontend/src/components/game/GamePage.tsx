import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore, selectIsMyTurn, selectMe, selectIsWaitingPlayer } from '../../store/gameStore';
import { useStrings } from '../../strings';
import { leaveTable, leaveTableById } from '../../networking/api';
import { PlayerHand } from './PlayerHand';
import { DiscardPile } from './DiscardPile';
import { OpponentSeat } from './OpponentSeat';
import { ActionBar } from './ActionBar';
import { ScoreBoard } from './ScoreBoard';
import { Chat } from './Chat';
import { RoundResultOverlay } from './RoundResultOverlay';
import { GameOverOverlay } from './GameOverOverlay';
import { TurnCountdown } from './TurnCountdown';
import { ToastContainer } from '../ui/Toast';

function opponentPositions(count: number): Array<{ top: string; left?: string; right?: string; transform?: string }> {
  if (count === 1) {
    return [{ top: '7%', left: '50%', transform: 'translateX(-50%)' }];
  }
  if (count === 2) {
    return [
      { top: '19%', left: '7%' },
      { top: '19%', right: '7%' },
    ];
  }
  if (count === 3) {
    return [
      { top: '19%', left: '7%' },
      { top: '7%', left: '50%', transform: 'translateX(-50%)' },
      { top: '19%', right: '7%' },
    ];
  }
  return [
    { top: '19%', left: '7%' },
    { top: '7%', left: '50%', transform: 'translateX(-50%)' },
    { top: '19%', right: '7%' },
    { top: '48%', right: '4%', transform: 'translateY(-50%)' },
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

function EmptySeat({ label }: { label: string }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 opacity-80"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 0.8, scale: 1 }}
    >
      <div className="flex items-center" style={{ minHeight: 56 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-8 h-12 rounded-lg border border-dashed border-white/25 bg-white/5"
            style={{
              marginInlineStart: i === 0 ? 0 : -12,
              zIndex: i,
              transform: `rotate(${(i - 1) * 6}deg)`,
              backdropFilter: 'blur(4px)',
            }}
          />
        ))}
      </div>

      <div className="px-3 py-1 rounded-full text-xs font-medium bg-black/20 text-white/60 border border-white/10">
        {label}
      </div>
    </motion.div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-5 h-5">
      <path d="M12.09 4a7.46 7.46 0 0 0-6.3 11.47L4 20l4.65-1.49a7.42 7.42 0 0 0 3.43.83h.01a7.46 7.46 0 0 0 0-14.92Zm0 13.99h-.01a6.18 6.18 0 0 1-3.15-.86l-.22-.13-2.76.88.9-2.69-.14-.23a6.2 6.2 0 1 1 5.38 3.03Zm3.4-4.64c-.18-.09-1.09-.53-1.26-.59-.17-.06-.29-.09-.41.09-.12.18-.47.59-.58.71-.1.12-.21.14-.39.05-.18-.09-.76-.28-1.44-.9-.53-.47-.88-1.06-.98-1.24-.1-.18-.01-.27.08-.36.08-.08.18-.21.27-.31.09-.1.12-.18.18-.3.06-.12.03-.23-.01-.32-.04-.09-.41-.99-.56-1.36-.15-.35-.3-.31-.41-.31h-.35c-.12 0-.31.04-.48.23-.16.18-.63.62-.63 1.52 0 .89.65 1.76.74 1.88.09.12 1.27 1.94 3.07 2.72.43.18.77.29 1.03.38.43.14.83.12 1.14.07.35-.05 1.09-.45 1.24-.87.15-.42.15-.77.11-.85-.05-.08-.17-.12-.35-.21Z" />
    </svg>
  );
}

export function GamePage() {
  const s = useStrings();
  const { tableId } = useParams<{ tableId: string }>();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('code') ?? '';
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const connect = useGameStore((s) => s.connect);
  const disconnect = useGameStore((s) => s.disconnect);
  const connectionState = useGameStore((s) => s.connectionState);
  const hostId = useGameStore((s) => s.hostId);
  const isPrivateTable = useGameStore((s) => s.isPrivateTable);
  const maxPlayers = useGameStore((s) => s.maxPlayers);
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const currentTurnUserId = useGameStore((s) => s.currentTurnUserId);
  const turnDeadlineEpoch = useGameStore((s) => s.turnDeadlineEpoch);
  const pauseState = useGameStore((s) => s.pauseState);
  const readyUp = useGameStore((s) => s.readyUp);
  const continuePausedGame = useGameStore((s) => s.continuePausedGame);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const me = useGameStore(selectMe);
  const isWaitingPlayer = useGameStore(selectIsWaitingPlayer);

  useEffect(() => {
    if (!tableId || !user) { navigate('/'); return; }
    connect(tableId, roomCode, user.sessionToken, user.userId);
    return () => { disconnect(); };
  }, [tableId]);

  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  async function handleLeaveTable() {
    if (!user || !tableId || leaving) return;
    setLeaving(true);
    try {
      if (roomCode) {
        await leaveTable(user.sessionToken, roomCode);
      } else {
        await leaveTableById(user.sessionToken, tableId);
      }
    } catch {
      // ignore — navigate away regardless
    }
    disconnect();
    navigate('/');
  }

  const opponents = players.filter((p) => p.userId !== user?.userId);
  const isLoading = !phase;
  const isWaiting = phase === 'waiting_for_players';
  const visibleSeatCount = isWaiting ? Math.max(0, maxPlayers - 1) : opponents.length;
  const positions = visibleSeatCount > 0 ? opponentPositions(visibleSeatCount) : [];
  const waitingSeatEntries = isWaiting
    ? Array.from({ length: visibleSeatCount }, (_, i) => opponents[i] ?? null)
    : opponents;
  const hostName = players.find((p) => p.userId === hostId)?.displayName ?? s.game.hostLabel;
  const connectedPlayersCount = players.filter((p) => p.isConnected).length;
  const isHost = !!user && user.userId === hostId;
  const canShowStartButton = isWaiting && isHost && players.length >= 2;
  const canStartGame = connectedPlayersCount >= 2;
  const inviteUrl = !isPrivateTable && roomCode ? `${window.location.origin}/?join=${encodeURIComponent(roomCode)}` : '';
  const whatsAppShareUrl = inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(s.game.shareInvite(roomCode, inviteUrl))}`
    : '';
  const showPauseOverlay = !isLoading && !isWaitingPlayer && !!pauseState && !!me && !me.isBot;
  const pauseMessage = pauseState?.reason === 'timeout'
    ? s.game.pauseAfterTimeout
    : s.game.pauseAfterDisconnect;

  return (
    <div className="felt relative w-full h-[100svh] overflow-hidden select-none">
      {/* Palm corner decorations */}
      <CornerPalm side="left" />
      <CornerPalm side="right" />
      <OceanStrip />

      {/* Top-end controls: exit */}
      <div className="absolute top-3 end-3 z-20">
        <AnimatePresence mode="wait">
          {showLeaveConfirm ? (
            <motion.div
              key="leave-confirm"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="rounded-2xl px-3 py-3 min-w-[180px]"
              style={{
                background: 'rgba(255,255,255,0.86)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 12px 32px rgba(12,74,110,0.18)',
                border: '1px solid rgba(242,100,25,0.22)',
              }}
            >
              <p className="text-xs font-medium text-center mb-3" style={{ color: '#7C5533' }}>
                {s.game.leaveConfirm}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleLeaveTable}
                  disabled={leaving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, #F26419, #D9560E)',
                    color: '#FFFBF0',
                    opacity: leaving ? 0.6 : 1,
                  }}
                >
                  {leaving ? s.game.leaving : s.game.leaveYes}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  disabled={leaving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'rgba(12,74,110,0.08)',
                    color: '#0C4A6E',
                    border: '1px solid rgba(12,74,110,0.12)',
                  }}
                >
                  {s.game.leaveCancel}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="leave-button"
              onClick={() => setShowLeaveConfirm(true)}
              disabled={leaving}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-md transition-transform hover:scale-105 active:scale-95"
              style={{
                background: 'rgba(242,100,25,0.15)',
                backdropFilter: 'blur(8px)',
                color: '#D9560E',
                border: '1.5px solid rgba(242,100,25,0.4)',
              }}
            >
              🚪
            </motion.button>
          )}
        </AnimatePresence>
      </div>

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
            {s.game.reconnecting}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scoreboard */}
      <ScoreBoard />

      {/* Chat */}
      <Chat />

      {/* ── Waiting room overlay (before game starts) ── */}
      <AnimatePresence>
        {isLoading && !isWaitingPlayer && (
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
                {s.game.waitingForPlayers}
              </p>
              <p className="text-sm mb-4" style={{ color: '#7C6A50' }}>
                {s.game.loadingRoom}
              </p>
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

      <AnimatePresence>
        {showPauseOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(12, 34, 52, 0.42)', backdropFilter: 'blur(6px)' }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="relative z-10 w-full max-w-sm rounded-[2rem] px-6 py-7 text-center"
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 24px 80px rgba(12,74,110,0.22)',
                border: '1px solid rgba(255,255,255,0.95)',
              }}
            >
              <div className="text-4xl mb-3">⏸️</div>
              <p
                className="text-xl font-semibold mb-2"
                style={{ color: '#1A3352', fontFamily: 'Syne, sans-serif' }}
              >
                {s.game.pausedTitle}
              </p>
              <p className="text-sm leading-6 mb-5" style={{ color: '#7C6A50' }}>
                {pauseMessage}
              </p>
              <button
                onClick={continuePausedGame}
                disabled={connectionState !== 'connected'}
                className="w-full py-3 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #F26419, #D9560E)',
                  color: '#FFFBF0',
                  boxShadow: '0 12px 28px rgba(242,100,25,0.28)',
                }}
              >
                {s.game.continueGame}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Opponents around table ── */}
      {!isLoading && !isWaitingPlayer && waitingSeatEntries.map((opponent, i) => (
        <div
          key={opponent?.userId ?? `empty-seat-${i}`}
          className="absolute"
          style={positions[i] ?? { top: '5%', left: '5%' }}
        >
          {opponent ? (
            <OpponentSeat
              player={opponent}
              isCurrentTurn={currentTurnUserId === opponent.userId}
            />
          ) : (
            <EmptySeat label={s.game.openSeat} />
          )}
        </div>
      ))}

      {/* ── Center: room waiting panel ── */}
      {!isLoading && isWaiting && !isWaitingPlayer && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4" style={{ zIndex: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="pointer-events-auto w-full max-w-sm rounded-[2rem] px-6 py-6 text-center"
            style={{
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 24px 80px rgba(12,74,110,0.18)',
              border: '1px solid rgba(255,255,255,0.88)',
            }}
          >
            <div className="text-xs font-semibold mb-2" style={{ color: '#0E7490' }}>
              {s.game.playersInRoom(players.length, maxPlayers)}
            </div>

            {!isPrivateTable && roomCode && (
              <div
                className="rounded-2xl px-4 py-3 mb-4 flex flex-col items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)' }}
              >
                <span className="text-xs font-medium" style={{ color: '#0E7490' }}>
                  {s.game.roomCodeLabel}
                </span>
                <span
                  className="text-3xl font-bold tracking-widest"
                  style={{ color: '#0E7490', fontFamily: 'Syne, sans-serif' }}
                >
                  {roomCode}
                </span>
                {whatsAppShareUrl && (
                  <a
                    href={whatsAppShareUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.game.shareOnWhatsApp}
                    title={s.game.shareOnWhatsApp}
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-transform active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.78)',
                      color: '#128C7E',
                      border: '1px solid rgba(18,140,126,0.16)',
                      boxShadow: '0 8px 18px rgba(12,74,110,0.08)',
                    }}
                  >
                    <WhatsAppIcon />
                    <span>{s.game.shareOnWhatsApp}</span>
                  </a>
                )}
              </div>
            )}

            <p
              className="text-lg font-semibold mb-2"
              style={{ color: '#1A3352', fontFamily: 'Syne, sans-serif' }}
            >
              {canShowStartButton ? s.game.roomReady : s.game.waitingForPlayers}
            </p>

            <p className="text-sm mb-5" style={{ color: '#7C6A50' }}>
              {players.length < 2
                ? s.game.waitingForMorePlayers
                : isHost
                  ? s.game.hostCanStart
                  : s.game.waitingForHostStart(hostName)}
            </p>

            {canShowStartButton && (
              <button
                onClick={readyUp}
                disabled={!canStartGame}
                className="w-full py-3 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #F26419, #D9560E)',
                  color: '#FFFBF0',
                  boxShadow: '0 12px 28px rgba(242,100,25,0.28)',
                }}
              >
                {s.game.startGame}
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Center: discard + draw pile ── */}
      {!isLoading && !isWaiting && !isWaitingPlayer && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-none flex flex-col items-center gap-2 -translate-y-7 sm:-translate-y-5">
            <TurnCountdown
              phase={phase}
              turnDeadlineEpoch={turnDeadlineEpoch}
              show={isMyTurn}
            />
            <div className="pointer-events-auto">
              <DiscardPile />
            </div>
          </div>
        </div>
      )}

      {/* ── My hand + action bar ── */}
      {!isLoading && !isWaitingPlayer && (
        <div className="absolute inset-x-0 flex flex-col items-center gap-1.5 px-3" style={{ zIndex: 5, bottom: '1.75rem' }}>
          <ActionBar />
          {me && (
            <motion.div
              animate={isMyTurn ? { scale: 1.04, y: [0, -2, 0] } : { scale: 1, y: 0 }}
              transition={isMyTurn ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                background: isMyTurn
                  ? 'linear-gradient(135deg, rgba(242,100,25,0.96), rgba(217,86,14,0.94))'
                  : 'rgba(255,255,255,0.76)',
                backdropFilter: 'blur(10px)',
                color: isMyTurn ? '#FFF7ED' : '#2D4F7C',
                border: isMyTurn
                  ? '1.5px solid rgba(255,255,255,0.28)'
                  : '1px solid rgba(226,201,154,0.5)',
                boxShadow: isMyTurn
                  ? '0 10px 24px rgba(242,100,25,0.28)'
                  : '0 8px 20px rgba(12,74,110,0.1)',
              }}
            >
              {me.displayName} · {me.score} נק׳
            </motion.div>
          )}
          <PlayerHand />
        </div>
      )}

      {/* Overlays */}
      <RoundResultOverlay />
      <GameOverOverlay />
      <ToastContainer />
    </div>
  );
}
