import type { Ref } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { CardView } from './CardView';
import type { CardId, DrawSource } from '../../shared/types';
import { useGameStore, selectCanDiscardAndDraw, selectMe } from '../../store/gameStore';

interface Props {
  deckRef?: Ref<HTMLDivElement>;
  discardRef?: Ref<HTMLDivElement>;
  onBeforeDiscardAndDraw?: (source: DrawSource) => void;
}

interface DrawLabel {
  id: number;
  name: string;
  source: DrawSource;
}

let drawLabelCounter = 0;

export function DiscardPile({ deckRef, discardRef, onBeforeDiscardAndDraw }: Props) {
  const discardPile = useGameStore((s) => s.discardPile);
  const discardAndDraw = useGameStore((s) => s.discardAndDraw);
  const canDiscardAndDraw = useGameStore(selectCanDiscardAndDraw);
  const lastTurnAnimation = useGameStore((s) => s.lastTurnAnimation);
  const players = useGameStore((s) => s.players);
  const me = useGameStore(selectMe);
  const [drawLabel, setDrawLabel] = useState<DrawLabel | null>(null);

  useEffect(() => {
    if (
      lastTurnAnimation?.action === 'draw' &&
      lastTurnAnimation.drawnSource &&
      lastTurnAnimation.actingUserId !== me?.userId
    ) {
      const player = players.find((p) => p.userId === lastTurnAnimation.actingUserId);
      if (!player) return;
      const label: DrawLabel = {
        id: ++drawLabelCounter,
        name: player.displayName,
        source: lastTurnAnimation.drawnSource,
      };
      setDrawLabel(label);
      const t = setTimeout(() => setDrawLabel((cur) => cur?.id === label.id ? null : cur), 2500);
      return () => clearTimeout(t);
    }
  }, [lastTurnAnimation?.seq]);

  const { currentSet } = discardPile;
  const canInteractWithPile = canDiscardAndDraw && currentSet.length > 0;

  // Track the last 2 discarded sets for visual history display
  const [historyStacks, setHistoryStacks] = useState<CardId[][]>([]);
  const prevSetRef = useRef<CardId[]>([]);
  useEffect(() => {
    const prev = prevSetRef.current;
    if (currentSet.length === 0) {
      // New round — clear history
      setHistoryStacks([]);
    } else if (prev.length > 0 && prev.join(',') !== currentSet.join(',')) {
      setHistoryStacks((old) => [...old.slice(-1), prev]);
    }
    prevSetRef.current = currentSet;
  }, [currentSet]);

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
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Discard set — top */}
      <div className="flex flex-col items-center justify-center relative">
        {/* History layers — faded cards peeking behind */}
        {historyStacks.map((set, hi) => {
          const opacity = hi === historyStacks.length - 1 ? 0.38 : 0.18;
          const offsetY = (historyStacks.length - hi) * 6;
          return (
            <div
              key={`hist-${hi}`}
              className="absolute flex items-end justify-center pointer-events-none"
              style={{ opacity, transform: `translateY(${offsetY}px)`, zIndex: 0 }}
            >
              {set.map((cardId, i) => {
                const centerOffset = i - (set.length - 1) / 2;
                return (
                  <div
                    key={i}
                    style={{
                      marginInlineStart: i === 0 ? 0 : -26,
                      zIndex: i,
                      transform: `rotate(${centerOffset * 5}deg)`,
                    }}
                  >
                    <CardView cardId={cardId} size="xl" />
                  </div>
                );
              })}
            </div>
          );
        })}
        <div ref={discardRef} className="relative flex items-end min-w-[6rem] min-h-[8.4rem] justify-center" style={{ zIndex: 1 }}>
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

      {/* Draw source label */}
      <div className="relative h-0 flex items-center justify-center" style={{ zIndex: 10 }}>
        <AnimatePresence>
          {drawLabel && (
            <motion.div
              key={drawLabel.id}
              initial={{ opacity: 0, y: -6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              transition={{ duration: 0.22 }}
              className="absolute px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap pointer-events-none"
              style={{
                background: drawLabel.source === 'deck'
                  ? 'rgba(8,145,178,0.88)'
                  : 'rgba(234,179,8,0.88)',
                color: '#FFFBF0',
                boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
                top: '-1rem',
              }}
            >
              {drawLabel.name} ← {drawLabel.source === 'deck' ? '🃏 חבילה' : '🗂 מחסנית'}
            </motion.div>
          )}
        </AnimatePresence>
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
