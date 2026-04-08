import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useStrings } from '../../strings';
import { CardView } from './CardView';
import { cardLabel } from '../../utils/cardUtils';

const HADABAKA_WINDOW_MS = 5_000;

export function HadabakaOverlay() {
  const s = useStrings();
  const phase = useGameStore((st) => st.phase);
  const currentTurnUserId = useGameStore((st) => st.currentTurnUserId);
  const hadabakaCard = useGameStore((st) => st.hadabakaCard);
  const turnDeadlineEpoch = useGameStore((st) => st.turnDeadlineEpoch);
  const players = useGameStore((st) => st.players);
  const hadabakaAccept = useGameStore((st) => st.hadabakaAccept);
  const user = useAuthStore((st) => st.user);

  const isActive = phase === 'player_turn_hadabaka';
  const isMyHadabaka = isActive && currentTurnUserId === user?.userId;

  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => {
    if (!isActive || !turnDeadlineEpoch) { setMsLeft(0); return; }

    const tick = () => setMsLeft(Math.max(0, turnDeadlineEpoch - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [isActive, turnDeadlineEpoch]);

  const currentPlayerName =
    players.find((p) => p.userId === currentTurnUserId)?.displayName ?? '...';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center pb-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="pointer-events-auto rounded-3xl shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255,251,240,0.97)',
              border: '2px solid rgba(242,100,25,0.4)',
              boxShadow: '0 12px 48px rgba(242,100,25,0.3)',
              minWidth: 260,
              maxWidth: 320,
            }}
            initial={{ y: 40, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.9 }}
          >
            {/* Header */}
            <div
              className="px-5 py-3 text-center font-bold text-lg"
              style={{
                background: 'linear-gradient(135deg, #F26419, #D9560E)',
                color: 'white',
                fontFamily: 'Syne, sans-serif',
              }}
            >
              {s.hadabaka.title}
            </div>

            <div className="px-5 py-4 flex flex-col items-center gap-4">
              {isMyHadabaka && hadabakaCard ? (
                <>
                  {/* Card preview */}
                  <CardView cardId={hadabakaCard} />

                  <p className="text-sm text-center font-medium" style={{ color: '#4A3728' }}>
                    {s.hadabaka.prompt(cardLabel(hadabakaCard))}
                  </p>

                  {/* Countdown bar */}
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: 6, background: 'rgba(226,201,154,0.4)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: msLeft < 1500 ? '#EF4444' : '#F26419',
                        width: `${Math.min(100, (msLeft / HADABAKA_WINDOW_MS) * 100)}%`,
                        transition: 'width 0.1s linear, background 0.3s',
                      }}
                    />
                  </div>

                  <button
                    onClick={hadabakaAccept}
                    className="w-full py-3 rounded-2xl font-bold text-base transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #F26419, #D9560E)',
                      color: 'white',
                      boxShadow: '0 4px 16px rgba(242,100,25,0.4)',
                    }}
                  >
                    {s.hadabaka.accept}
                  </button>
                </>
              ) : (
                <p className="text-sm text-center py-2" style={{ color: '#7C6A50' }}>
                  {s.hadabaka.waiting(currentPlayerName)}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
