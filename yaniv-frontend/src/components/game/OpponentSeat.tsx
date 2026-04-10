import type { Ref } from 'react';
import { motion } from 'framer-motion';
import { CardView } from './CardView';
import { useStrings } from '../../strings';
import type { CardId, PublicPlayerInfo } from '../../shared/types';

interface Props {
  player: PublicPlayerInfo;
  isCurrentTurn: boolean;
  cardsRef?: Ref<HTMLDivElement>;
  revealedCards?: CardId[];
  revealedTotal?: number;
  roundDelta?: number | null;
  roundTag?: string | null;
  /** 'left'/'right' → cards stack top-to-bottom (each card still portrait) */
  orientation?: 'top' | 'left' | 'right';
}

export function OpponentSeat({
  player,
  isCurrentTurn,
  cardsRef,
  revealedCards,
  revealedTotal,
  roundDelta,
  roundTag,
  orientation = 'top',
}: Props) {
  const s = useStrings();
  const isRevealed = !!revealedCards;
  const isSide = orientation === 'left' || orientation === 'right';

  const cards = isRevealed
    ? revealedCards!
    : player.isEliminated
      ? []
      : Array.from({ length: player.cardCount }, (_, i) => `XX-${i}` as CardId);
  const count = cards.length;

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      animate={isCurrentTurn ? { scale: 1.05, y: [0, -2, 0] } : { scale: 1, y: 0 }}
      transition={isCurrentTurn ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      {/* Card fan */}
      <div
        ref={cardsRef}
        className={isSide ? 'flex flex-col items-center' : 'flex items-center justify-center'}
        style={isSide ? { minWidth: 56 } : { minHeight: 72 }}
      >
        {player.isEliminated && !isRevealed ? (
          <span className="text-red-400 text-xs font-medium">{s.game.eliminated}</span>
        ) : (
          cards.map((cardId, i) => {
            const centerOffset = i - (count - 1) / 2;
            return (
              <div
                key={isRevealed ? `${cardId}-${i}` : i}
                style={isSide ? {
                  // vertical arrangement: cards overlap top-to-bottom, fan spreads sideways
                  marginTop: i === 0 ? 0 : -32,
                  zIndex: i,
                  transform: `rotate(${centerOffset * 4}deg) translateX(${centerOffset * 3}px)`,
                } : {
                  // horizontal arrangement: cards overlap left-to-right, fan spreads up/down
                  marginInlineStart: i === 0 ? 0 : -18,
                  zIndex: i,
                  transform: `rotate(${centerOffset * 5}deg) translateY(${Math.abs(centerOffset) * 1.5}px)`,
                }}
              >
                {isRevealed
                  ? <CardView cardId={cardId} small />
                  : <CardView cardId="XX" faceDown size="sm" />}
              </div>
            );
          })
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
        {roundTag && <span className="ms-1 text-[0.7rem] opacity-90">· {roundTag}</span>}
        {!player.isConnected && !player.isEliminated && ` (${s.game.disconnected})`}
      </div>

      {/* Round-result hand total (shown only at end of round) */}
      {isRevealed && (
        <span className="text-white/65 text-[11px] font-medium text-center">
          {s.game.handTotal(revealedTotal ?? 0)}
          {roundDelta !== null && roundDelta !== undefined && (
            <span className={['ms-1', roundDelta > 0 ? 'text-red-300' : 'text-emerald-300'].join(' ')}>
              • {s.round.pointsAdded(roundDelta)}
            </span>
          )}
        </span>
      )}
    </motion.div>
  );
}
