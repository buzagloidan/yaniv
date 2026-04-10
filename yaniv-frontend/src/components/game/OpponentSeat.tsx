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
  const isVertical = orientation === 'left' || orientation === 'right';

  const renderCards = () => {
    if (player.isEliminated && !isRevealed) {
      return <span className="text-red-400 text-xs font-medium">{s.game.eliminated}</span>;
    }

    const cards = isRevealed ? revealedCards! : Array.from({ length: player.cardCount }, (_, i) => `XX-${i}` as CardId);
    const count = cards.length;

    if (isVertical) {
      // Vertical fan for side players
      return cards.map((cardId, i) => {
        const centerOffset = i - (count - 1) / 2;
        return (
          <div
            key={isRevealed ? `${cardId}-${i}` : i}
            style={{
              marginTop: i === 0 ? 0 : -32,
              zIndex: i,
              transform: `rotate(${centerOffset * 4}deg) translateX(${centerOffset * 2}px)`,
            }}
          >
            {isRevealed
              ? <CardView cardId={cardId} small />
              : <CardView cardId="XX" faceDown size="sm" />}
          </div>
        );
      });
    }

    // Horizontal fan (top player)
    return cards.map((cardId, i) => {
      const centerOffset = i - (count - 1) / 2;
      return (
        <div
          key={isRevealed ? `${cardId}-${i}` : i}
          style={{
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
    });
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      animate={isCurrentTurn ? { scale: 1.05, y: [0, -2, 0] } : { scale: 1, y: 0 }}
      transition={isCurrentTurn ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      {/* Card backs */}
      <div
        ref={cardsRef}
        className={isVertical ? 'flex flex-col items-center' : 'flex items-center justify-center'}
        style={isVertical ? { minWidth: 56 } : { minHeight: 72 }}
      >
        {renderCards()}
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

      {/* Score */}
      {isRevealed ? (
        <span className="text-white/65 text-[11px] font-medium text-center">
          {s.game.handTotal(revealedTotal ?? 0)}
          {roundDelta !== null && roundDelta !== undefined && (
            <span className={['ms-1', roundDelta > 0 ? 'text-red-300' : 'text-emerald-300'].join(' ')}>
              • {s.round.pointsAdded(roundDelta)}
            </span>
          )}
        </span>
      ) : (
        <span className="text-white/55 text-xs font-medium">{player.score} {s.game.score ?? 'נק׳'}</span>
      )}
    </motion.div>
  );
}
