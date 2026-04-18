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

function previewOffset(index: number, count: number, frontCount: number): {
  x: number;
  y: number;
  rotate: number;
} {
  const centerOffset = index - (count - 1) / 2;

  if (frontCount > 1) {
    return {
      x: centerOffset * 4,
      y: 0,
      rotate: centerOffset * 5,
    };
  }

  // When the front discard is a single card, fan the preview cards wider so
  // older singles still peek out from behind it.
  const alternatingIndex = index === 0 ? 1 : (index % 2 === 1 ? -index : index + 1);

  return {
    x: alternatingIndex * 12,
    y: Math.abs(alternatingIndex) <= 1 ? 2 : 5,
    rotate: alternatingIndex * 7,
  };
}

export function DiscardPile({ deckRef, discardRef, onBeforeDiscardAndDraw }: Props) {
  const discardPile = useGameStore((s) => s.discardPile);
  const discardAndDraw = useGameStore((s) => s.discardAndDraw);
  const canDiscardAndDraw = useGameStore(selectCanDiscardAndDraw);
  const lastTurnAnimation = useGameStore((s) => s.lastTurnAnimation);

  const { currentSet, previousSetPreview } = discardPile;
  const canInteractWithPile = canDiscardAndDraw && currentSet.length > 0;

  const deckPulseSeq =
    lastTurnAnimation?.action === 'draw' && lastTurnAnimation.drawnSource === 'deck'
      ? lastTurnAnimation.seq
      : 0;
  const discardDrawPulseSeq =
    lastTurnAnimation?.action === 'draw' &&
    (lastTurnAnimation.drawnSource === 'discard_first' ||
      lastTurnAnimation.drawnSource === 'discard_last')
      ? lastTurnAnimation.seq
      : 0;
  const discardAnimationSeq =
    lastTurnAnimation?.action === 'discard' ? lastTurnAnimation.seq : 0;
  const deckControls = useAnimation();
  const discardControls = useAnimation();
  useEffect(() => {
    if (deckPulseSeq) {
      deckControls.start({ scale: [1, 1.08, 1], rotate: [0, -7, 0], transition: { duration: 0.56, ease: 'easeOut' } });
    }
  }, [deckPulseSeq]);
  useEffect(() => {
    if (discardDrawPulseSeq) {
      discardControls.start({
        scale: [1, 1.1, 1.04, 1],
        y: [0, -10, -2, 0],
        rotate: [0, -2, 2, 0],
        transition: { duration: 0.62, ease: 'easeOut', times: [0, 0.24, 0.68, 1] },
      });
    }
  }, [discardControls, discardDrawPulseSeq]);
  const triggerDiscardAndDraw = (source: DrawSource) => {
    if (!canDiscardAndDraw) return;
    onBeforeDiscardAndDraw?.(source);
    discardAndDraw(source);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Discard set — top */}
      <div className="flex flex-col items-center justify-center relative">
        {/* History layers — faded cards peeking behind */}
        {previousSetPreview.length > 0 && (
          <div
            className="absolute flex items-end justify-center pointer-events-none"
            style={{ opacity: 0.32, transform: 'translateY(6px)', zIndex: 0 }}
          >
            {previousSetPreview.map((cardId, i) => {
              const offset = previewOffset(i, previousSetPreview.length, currentSet.length);
              return (
                <div
                  key={`${cardId}-${i}`}
                  style={{
                    marginInlineStart: i === 0 ? 0 : -26,
                    zIndex: i,
                    transform: `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${offset.rotate}deg)`,
                  }}
                >
                  <CardView cardId={cardId} size="xl" />
                </div>
              );
            })}
          </div>
        )}
        {discardDrawPulseSeq ? (
          <motion.div
            key={`discard-glow-${discardDrawPulseSeq}`}
            className="absolute inset-x-0 top-2 mx-auto rounded-full pointer-events-none"
            style={{
              width: 118,
              height: 118,
              background: 'radial-gradient(circle, rgba(242,100,25,0.34) 0%, rgba(255,213,183,0.18) 46%, rgba(242,100,25,0) 72%)',
              zIndex: 0,
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.16, 1.32], opacity: [0, 0.88, 0] }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
          />
        ) : null}
        <motion.div
          ref={discardRef}
          className="relative flex items-end min-w-[6rem] min-h-[8.4rem] justify-center"
          style={{ zIndex: 1 }}
          animate={discardControls}
        >
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
        </motion.div>
        </div>


      {/* Draw pile — bottom */}
      {deckPulseSeq ? (
        <motion.div
          key={`deck-glow-${deckPulseSeq}`}
          className="absolute bottom-0 rounded-full pointer-events-none"
          style={{
            width: 124,
            height: 124,
            background: 'radial-gradient(circle, rgba(8,145,178,0.28) 0%, rgba(125,211,252,0.18) 44%, rgba(8,145,178,0) 72%)',
            zIndex: 0,
          }}
          initial={{ scale: 0.48, opacity: 0 }}
          animate={{ scale: [0.48, 1.12, 1.28], opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.68, ease: 'easeOut' }}
        />
      ) : null}
      <motion.div
        ref={deckRef}
        className="relative cursor-pointer w-[5.75rem] h-[8.25rem] rounded-[1.1rem] overflow-hidden"
        animate={deckControls}
        whileHover={canDiscardAndDraw ? { scale: 1.05 } : undefined}
        whileTap={canDiscardAndDraw ? { scale: 0.97 } : undefined}
        onClick={() => triggerDiscardAndDraw('deck')}
      >
        <img
          src="/yaniv-deck.webp"
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scale(1.12)', transformOrigin: 'center', objectFit: 'cover' }}
          draggable={false}
        />
      </motion.div>
    </div>
  );
}
