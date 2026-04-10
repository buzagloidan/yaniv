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
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CardView({
  cardId,
  selected = false,
  faceDown = false,
  onClick,
  className,
  small = false,
  size,
}: CardViewProps) {
  const resolvedSize = size ?? (small ? 'sm' : 'md');
  const sizeClasses = {
    sm: {
      w: 'w-11 sm:w-12',
      h: 'h-16 sm:h-[4.5rem]',
      textSm: 'text-[11px] sm:text-xs',
      textLg: 'text-xl sm:text-2xl',
    },
    md: {
      w: 'w-[4.15rem] sm:w-[4.35rem]',
      h: 'h-[6.15rem] sm:h-[6.45rem]',
      textSm: 'text-sm',
      textLg: 'text-[2rem] sm:text-[2.15rem]',
    },
    lg: {
      w: 'w-[4.6rem] sm:w-[4.9rem]',
      h: 'h-[6.8rem] sm:h-[7.2rem]',
      textSm: 'text-sm sm:text-[0.95rem]',
      textLg: 'text-[2.2rem] sm:text-[2.45rem]',
    },
    xl: {
      w: 'w-[5rem] sm:w-[5.45rem]',
      h: 'h-[7.4rem] sm:h-[8rem]',
      textSm: 'text-[0.95rem] sm:text-base',
      textLg: 'text-[2.4rem] sm:text-[2.7rem]',
    },
  } as const;
  const { w, h, textSm, textLg } = sizeClasses[resolvedSize];

  if (faceDown) {
    return (
      <motion.div
        layout
        className={cn('card rounded-lg overflow-hidden', w, h, className)}
        whileHover={onClick ? { scale: 1.05 } : undefined}
        onClick={onClick}
      >
        <img
          src="/yaniv-card.png"
          alt=""
          className="w-full h-full object-fill"
          draggable={false}
        />
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
