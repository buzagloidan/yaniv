import type { Ref } from 'react';
import { motion } from 'framer-motion';
import { CardView } from './CardView';
import { useStrings } from '../../strings';
import type { PublicPlayerInfo } from '../../shared/types';

interface Props {
  player: PublicPlayerInfo;
  isCurrentTurn: boolean;
  cardsRef?: Ref<HTMLDivElement>;
}

export function OpponentSeat({ player, isCurrentTurn, cardsRef }: Props) {
  const s = useStrings();
  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      animate={isCurrentTurn ? { scale: 1.05, y: [0, -2, 0] } : { scale: 1, y: 0 }}
      transition={isCurrentTurn ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      {/* Card backs */}
      <div ref={cardsRef} className="flex items-center justify-center" style={{ minHeight: 72 }}>
        {player.isEliminated ? (
          <span className="text-red-400 text-xs font-medium">{s.game.eliminated}</span>
        ) : (
          Array.from({ length: player.cardCount }).map((_, i) => (
            <div
              key={i}
              style={{
                marginInlineStart: i === 0 ? 0 : -18,
                zIndex: i,
                transform: `rotate(${(i - (player.cardCount - 1) / 2) * 5}deg) translateY(${Math.abs(i - (player.cardCount - 1) / 2) * 1.5}px)`,
              }}
            >
              <CardView cardId="XX" faceDown size="sm" />
            </div>
          ))
        )}
      </div>

      {/* Name badge */}
      <div
        className="px-3.5 py-1.5 rounded-full text-[0.8rem] font-semibold transition-all"
        style={{
          background: isCurrentTurn
            ? 'linear-gradient(135deg, rgba(242,100,25,0.96), rgba(217,86,14,0.94))'
            : 'rgba(75, 64, 45, 0.34)',
          color: isCurrentTurn ? '#FFF7ED' : 'rgba(255,251,240,0.92)',
          border: isCurrentTurn
            ? '1.5px solid rgba(255,255,255,0.28)'
            : '1px solid rgba(255,255,255,0.16)',
          boxShadow: isCurrentTurn
            ? '0 10px 24px rgba(242,100,25,0.28)'
            : '0 6px 14px rgba(12,74,110,0.12)',
          opacity: !player.isConnected && !player.isEliminated ? 0.55 : 1,
        }}
      >
        {player.displayName}
        {!player.isConnected && !player.isEliminated && ` (${s.game.disconnected})`}
      </div>

      {/* Score */}
      <span className="text-white/55 text-xs font-medium">{player.score} {s.game.score ?? 'נק׳'}</span>
    </motion.div>
  );
}
