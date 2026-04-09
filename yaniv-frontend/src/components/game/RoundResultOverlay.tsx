import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStrings } from '../../strings';

export function RoundResultOverlay() {
  const s = useStrings();
  const result = useGameStore((s) => s.roundResult);
  const players = useGameStore((s) => s.players);
  const pauseState = useGameStore((s) => s.pauseState);
  const [nextRoundDeadline, setNextRoundDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const open = !!result;

  const getName = (id: string) =>
    players.find((p) => p.userId === id)?.displayName ?? id;

  useEffect(() => {
    if (!result || result.nextRoundStartsIn <= 0 || pauseState) {
      setNextRoundDeadline(null);
      return;
    }

    setNextRoundDeadline(Date.now() + result.nextRoundStartsIn);
  }, [result, pauseState]);

  useEffect(() => {
    if (!nextRoundDeadline) return;

    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, [nextRoundDeadline]);

  const nextRoundSeconds =
    nextRoundDeadline === null
      ? null
      : Math.max(0, Math.ceil((nextRoundDeadline - now) / 1000));

  const footerText = pauseState
    ? s.game.pausedTitle
    : nextRoundSeconds === null
      ? s.round.nextRound
      : s.round.nextRoundIn(nextRoundSeconds);

  return (
    <AnimatePresence>
      {open && result && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative flex w-full max-w-sm flex-col items-center gap-2 rounded-[1.75rem] px-5 py-4 text-center shadow-2xl"
            initial={{ scale: 0.92, y: -16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: -16 }}
            style={{
              background: 'rgba(15, 23, 42, 0.86)',
              backdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div className="text-center">
              {result.callType === 'assaf' ? (
                <div>
                  <div className="text-2xl mb-1">💥</div>
                  <h2 className="text-base font-bold text-red-400">
                    {s.round.assaf(
                      getName(result.callerId),
                      getName(result.assafByIds[0] ?? ''),
                    )}
                  </h2>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-1">🎉</div>
                  <h2 className="text-base font-bold text-yellow-400">
                    {s.round.yanivCalled(getName(result.callerId))}
                  </h2>
                </div>
              )}
            </div>

            <div
              className="w-full rounded-2xl px-4 py-2 text-center text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.72)',
              }}
            >
              {footerText}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
