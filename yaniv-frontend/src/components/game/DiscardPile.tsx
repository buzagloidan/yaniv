import { motion, AnimatePresence } from 'framer-motion';
import { CardView } from './CardView';
import { useGameStore, selectCanDiscardAndDraw } from '../../store/gameStore';

export function DiscardPile() {
  const discardPile = useGameStore((s) => s.discardPile);
  const discardAndDraw = useGameStore((s) => s.discardAndDraw);
  const canDiscardAndDraw = useGameStore(selectCanDiscardAndDraw);

  const { currentSet } = discardPile;
  const canInteractWithPile = canDiscardAndDraw && currentSet.length > 0;

  return (
    <div
      className="flex items-center justify-center gap-4 sm:gap-5 rounded-[2rem] px-4 py-3 sm:px-5 sm:py-4"
      style={{
        background: 'rgba(255,251,240,0.18)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 18px 48px rgba(12,74,110,0.08)',
      }}
    >
      {/* Draw pile */}
      <div className="flex flex-col items-center justify-center">
        <motion.div
          className="relative cursor-pointer"
          whileHover={canDiscardAndDraw ? { scale: 1.05 } : undefined}
          whileTap={canDiscardAndDraw ? { scale: 0.97 } : undefined}
          onClick={() => canDiscardAndDraw && discardAndDraw('deck')}
        >
          {/* Stack effect — offset shadow cards */}
          {[2, 1].map((offset) => (
            <div
              key={offset}
              className="absolute rounded-lg overflow-hidden opacity-50"
              style={{
                width: 92, height: 132,
                top: -offset * 3,
                left: -offset * 3,
                zIndex: 3 - offset,
              }}
            >
              <img src="/yaniv-deck.png" alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          ))}
          <div
            className={[
              'relative z-10 w-[5.75rem] h-[8.25rem] rounded-[1.1rem] overflow-hidden transition-all',
              canDiscardAndDraw ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : '',
            ].join(' ')}
          >
            <img src="/yaniv-deck.png" alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        </motion.div>
      </div>

      {/* Discard set */}
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-end min-w-[6rem] min-h-[8.4rem] justify-center">
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

                return (
                  <motion.div
                    key={cardId}
                    layout
                    initial={{ scale: 0.8, opacity: 0, y: -20, rotate: centerOffset * 5 }}
                    animate={{ scale: 1, opacity: 1, y: Math.abs(centerOffset) * 3, rotate: centerOffset * 5 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    style={{
                      marginInlineStart: i === 0 ? 0 : -26,
                      zIndex: i + 1,
                    }}
                  >
                    <CardView
                      cardId={cardId}
                      size="xl"
                      onClick={canPickThis ? () => discardAndDraw(isFirst ? 'discard_first' : 'discard_last') : undefined}
                      className={canPickThis ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent' : ''}
                    />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
