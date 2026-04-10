import type { Ref } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { CardView } from './CardView';
import type { DrawSource } from '../../shared/types';
import { useGameStore, selectCanDiscardAndDraw } from '../../store/gameStore';

interface Props {
  deckRef?: Ref<HTMLDivElement>;
  discardRef?: Ref<HTMLDivElement>;
  onBeforeDiscardAndDraw?: (source: DrawSource) => void;
}

export function DiscardPile({ deckRef, discardRef, onBeforeDiscardAndDraw }: Props) {
  const discardPile = useGameStore((s) => s.discardPile);
  const discardAndDraw = useGameStore((s) => s.discardAndDraw);
  const canDiscardAndDraw = useGameStore(selectCanDiscardAndDraw);
  const lastTurnAnimation = useGameStore((s) => s.lastTurnAnimation);

  const { currentSet } = discardPile;
  const canInteractWithPile = canDiscardAndDraw && currentSet.length > 0;
  const deckPulseSeq =
    lastTurnAnimation?.action === 'draw' && lastTurnAnimation.drawnSource === 'deck'
      ? lastTurnAnimation.seq
      : 0;
  const discardAnimationSeq =
    lastTurnAnimation?.action === 'discard' ? lastTurnAnimation.seq : 0;
  const deckControls = useAnimation();
  useEffect(() => {
    if (deckPulseSeq) {
      deckControls.start({ scale: [1, 1.08, 1], rotate: [0, -7, 0], transition: { duration: 0.56, ease: 'easeOut' } });
    }
  }, [deckPulseSeq]);
  const triggerDiscardAndDraw = (source: DrawSource) => {
    if (!canDiscardAndDraw) return;
    onBeforeDiscardAndDraw?.(source);
    discardAndDraw(source);
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[2rem] px-5 py-4"
      style={{
        background: 'rgba(255,251,240,0.18)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 18px 48px rgba(12,74,110,0.08)',
      }}
    >
      {/* Discard set — top */}
      <div className="flex flex-col items-center justify-center">
        <div ref={discardRef} className="flex items-end min-w-[6rem] min-h-[8.4rem] justify-center">
          <AnimatePresence mode="popLayout">
            {currentSet.length === 0 ? (
              <div className="w-[5rem] h-[7.25rem] rounded-[1.1rem] border-2 border-dashed border-white/15 flex items-center justify-center">
                <span className="text-white/20 text-xs">ריק</span>
              </div>
            ) : (
              currentSet.map((cardId, i) => {
                const isFirst = i === 0;
                const isLast = i === currentSet.length - 1;
                const canPickThis = canInteractWithPile && (isFirst || isLast);
                const centerOffset = i - (currentSet.length - 1) / 2;
                const isFreshDiscard =
                  lastTurnAnimation?.action === 'discard' &&
                  lastTurnAnimation.discardedCards?.includes(cardId);

                return (
                  <motion.div
                    key={`${cardId}-${isFreshDiscard ? discardAnimationSeq : 'steady'}`}
                    layout
                    initial={
                      isFreshDiscard
                        ? false
                        : { scale: 0.8, opacity: 0, y: -20, rotate: centerOffset * 5 }
                    }
                    animate={
                      isFreshDiscard
                        ? {
                            scale: [0.98, 0.98, 1],
                            opacity: [0, 0, 1],
                            y: Math.abs(centerOffset) * 3,
                            rotate: centerOffset * 5,
                          }
                        : {
                            scale: 1,
                            opacity: 1,
                            y: Math.abs(centerOffset) * 3,
                            rotate: centerOffset * 5,
                          }
                    }
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={
                      isFreshDiscard
                        ? { duration: 0.78, ease: 'easeOut', times: [0, 0.8, 1] }
                        : { duration: 0.2 }
                    }
                    style={{
                      marginInlineStart: i === 0 ? 0 : -26,
                      zIndex: i + 1,
                    }}
                  >
                    <CardView
                      cardId={cardId}
                      size="xl"
                      onClick={canPickThis ? () => triggerDiscardAndDraw(isFirst ? 'discard_first' : 'discard_last') : undefined}
                      className={canPickThis ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent' : ''}
                    />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Draw pile — bottom */}
      <motion.div
        ref={deckRef}
        className="relative cursor-pointer w-[5.75rem] h-[8.25rem] rounded-[1.1rem] overflow-hidden"
        animate={deckControls}
        whileHover={canDiscardAndDraw ? { scale: 1.05 } : undefined}
        whileTap={canDiscardAndDraw ? { scale: 0.97 } : undefined}
        onClick={() => triggerDiscardAndDraw('deck')}
      >
        <img
          src="/yaniv-deck.png"
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scale(1.12)', transformOrigin: 'center', objectFit: 'cover' }}
          draggable={false}
        />
      </motion.div>
    </div>
  );
}
