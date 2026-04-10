import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GamePhase } from '../../shared/types';

interface Props {
  phase: GamePhase | null;
  turnDeadlineEpoch: number | null;
  show: boolean;
}

function isTimedTurnPhase(phase: GamePhase | null): boolean {
  return (
    phase === 'player_turn_discard' ||
    phase === 'player_turn_draw' ||
    phase === 'player_turn_hadabaka'
  );
}

export function TurnCountdown({ phase, turnDeadlineEpoch, show }: Props) {
  const [now, setNow] = useState(() => Date.now());

  const isVisible = show && turnDeadlineEpoch !== null && isTimedTurnPhase(phase);

  useEffect(() => {
    if (!isVisible) return;

    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [isVisible, turnDeadlineEpoch]);

  if (!isVisible) return null;

  const secondsLeft = Math.max(0, Math.ceil((turnDeadlineEpoch - now) / 1000));
  const isUrgent = secondsLeft <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isUrgent ? [1, 1.03, 1] : 1,
      }}
      transition={isUrgent ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.18 }}
      className="min-w-[4.25rem] px-3 py-2 rounded-full font-bold shadow-lg"
      style={{
        background: isUrgent ? 'rgba(220, 38, 38, 0.88)' : 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(10px)',
        color: isUrgent ? '#FFF7ED' : '#0C4A6E',
        border: isUrgent
          ? '1.5px solid rgba(255,255,255,0.36)'
          : '1.5px solid rgba(8,145,178,0.28)',
        boxShadow: isUrgent
          ? '0 10px 28px rgba(220,38,38,0.32)'
          : '0 10px 28px rgba(12,74,110,0.14)',
        fontFamily: 'Syne, sans-serif',
      }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <img src="/clock-button.png" alt="" aria-hidden="true" style={{ width: 20, height: 20, objectFit: 'contain' }} />
        <span className="tabular-nums text-lg leading-none">{secondsLeft}</span>
      </div>
    </motion.div>
  );
}
