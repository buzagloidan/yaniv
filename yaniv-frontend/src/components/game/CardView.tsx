import { motion } from 'framer-motion';
import { parseCard, isJoker, SUIT_SYMBOL, SUIT_COLOR } from '../../utils/cardUtils';
import { cn } from '../../utils/cn';
import type { CardId } from '../../shared/types';

interface CardViewProps {
  cardId: CardId;
  selected?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  className?: string;
  small?: boolean;
}

export function CardView({
  cardId,
  selected = false,
  faceDown = false,
  onClick,
  className,
  small = false,
}: CardViewProps) {
  const w = small ? 'w-10' : 'w-16';
  const h = small ? 'h-14' : 'h-24';
  const textSm = small ? 'text-xs' : 'text-sm';
  const textLg = small ? 'text-lg' : 'text-3xl';

  if (faceDown) {
    return (
      <motion.div
        layout
        className={cn('card rounded-lg overflow-hidden', w, h, className)}
        whileHover={onClick ? { scale: 1.05 } : undefined}
        onClick={onClick}
      >
        <img src="/yaniv-card.svg" alt="" className="w-full h-full object-cover" draggable={false} />
      </motion.div>
    );
  }

  const joker = isJoker(cardId);
  const { rank, suit } = parseCard(cardId);
  const symbol = joker ? '🃏' : (SUIT_SYMBOL[suit] ?? suit);
  const color = joker ? '#7c3aed' : (SUIT_COLOR[suit] ?? '#000');

  return (
    <motion.div
      layout
      onClick={onClick}
      className={cn(
        'card rounded-lg bg-white relative flex flex-col cursor-default',
        onClick && 'cursor-pointer',
        selected && 'card-selected',
        w, h,
        className,
      )}
      whileHover={onClick ? { scale: 1.08 } : undefined}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      animate={selected ? { y: -10 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{ color }}
    >
      {/* Top-right rank + suit (RTL: visually appears top-right) */}
      <div className={cn('absolute top-1 right-1.5 leading-none font-bold', textSm)}>
        <div>{joker ? '★' : rank}</div>
        <div>{joker ? '' : symbol}</div>
      </div>

      {/* Center symbol */}
      <div className={cn('flex-1 flex items-center justify-center font-bold select-none', textLg)}>
        {symbol}
      </div>

      {/* Bottom-left rank + suit (rotated 180°, RTL: visually bottom-left) */}
      <div
        className={cn('absolute bottom-1 left-1.5 leading-none font-bold rotate-180', textSm)}
      >
        <div>{joker ? '★' : rank}</div>
        <div>{joker ? '' : symbol}</div>
      </div>
    </motion.div>
  );
}
