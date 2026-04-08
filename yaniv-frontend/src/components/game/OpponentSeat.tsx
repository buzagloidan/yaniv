import { motion } from 'framer-motion';
import { CardView } from './CardView';
import { he } from '../../strings/he';
import type { PublicPlayerInfo } from '../../shared/types';

interface Props {
  player: PublicPlayerInfo;
  isCurrentTurn: boolean;
}

export function OpponentSeat({ player, isCurrentTurn }: Props) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      animate={isCurrentTurn ? { scale: 1.05 } : { scale: 1 }}
    >
      {/* Card backs */}
      <div className="flex items-center" style={{ minHeight: 56 }}>
        {player.isEliminated ? (
          <span className="text-red-400 text-xs font-medium">{he.game.eliminated}</span>
        ) : (
          Array.from({ length: player.cardCount }).map((_, i) => (
            <div
              key={i}
              style={{
                marginInlineStart: i === 0 ? 0 : -20,
                zIndex: i,
                transform: `rotate(${(i - (player.cardCount - 1) / 2) * 6}deg)`,
              }}
            >
              <CardView cardId="XX" faceDown small />
            </div>
          ))
        )}
      </div>

      {/* Name badge */}
      <div
        className={[
          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
          isCurrentTurn
            ? 'bg-yellow-400 text-gray-900'
            : 'bg-black/30 text-white/70',
          !player.isConnected && !player.isEliminated ? 'opacity-50' : '',
        ].join(' ')}
      >
        {isCurrentTurn && '• '}
        {player.displayName}
        {!player.isConnected && !player.isEliminated && ` (${he.game.disconnected})`}
      </div>

      {/* Score */}
      <span className="text-white/40 text-xs">{player.score} {he.game.score ?? 'נק׳'}</span>
    </motion.div>
  );
}
