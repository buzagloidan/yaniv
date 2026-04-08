import { motion, AnimatePresence } from 'framer-motion';
import { CardView } from './CardView';
import { useGameStore, selectCanDiscardAndDraw } from '../../store/gameStore';
import { useStrings } from '../../strings';

export function DiscardPile() {
  const s = useStrings();
  const discardPile = useGameStore((s) => s.discardPile);
  const discardAndDraw = useGameStore((s) => s.discardAndDraw);
  const canDiscardAndDraw = useGameStore(selectCanDiscardAndDraw);

  const { currentSet, deckCount } = discardPile;
  const canInteractWithPile = canDiscardAndDraw && currentSet.length > 0;

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Draw pile */}
      <div className="flex flex-col items-center gap-2">
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
                width: 64, height: 96,
                top: -offset * 2,
                left: -offset * 2,
                zIndex: 3 - offset,
              }}
            >
              <img src="/yaniv-deck.svg" alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          ))}
          <div
            className={[
              'relative z-10 w-16 h-24 rounded-lg overflow-hidden transition-all',
              canDiscardAndDraw ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : '',
            ].join(' ')}
          >
            <img src="/yaniv-deck.svg" alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        </motion.div>
        <span className="text-white/50 text-xs">{s.game.cardsLeft(deckCount)}</span>
        {canDiscardAndDraw && (
          <button
            onClick={() => discardAndDraw('deck')}
            className="text-yellow-300 text-xs hover:text-yellow-100 transition-colors"
          >
            {s.game.drawFromDeck}
          </button>
        )}
      </div>

      {/* Discard set */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-end gap-1 min-w-[72px] min-h-[96px] justify-center">
          <AnimatePresence mode="popLayout">
            {currentSet.length === 0 ? (
              <div className="w-16 h-24 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <span className="text-white/20 text-xs">ריק</span>
              </div>
            ) : (
              currentSet.map((cardId, i) => {
                const isFirst = i === 0;
                const isLast = i === currentSet.length - 1;
                const canPickThis = canInteractWithPile && (isFirst || isLast);

                return (
                  <motion.div
                    key={cardId}
                    layout
                    initial={{ scale: 0.8, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <CardView
                      cardId={cardId}
                      onClick={canPickThis ? () => discardAndDraw(isFirst ? 'discard_first' : 'discard_last') : undefined}
                      className={canPickThis ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent' : ''}
                    />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
        {canInteractWithPile && currentSet.length > 1 && (
          <div className="flex gap-3 text-xs text-yellow-300">
            <button onClick={() => discardAndDraw('discard_first')} className="hover:text-yellow-100">
              {s.game.drawFirst}
            </button>
            <button onClick={() => discardAndDraw('discard_last')} className="hover:text-yellow-100">
              {s.game.drawLast}
            </button>
          </div>
        )}
        {canInteractWithPile && currentSet.length === 1 && (
          <button
            onClick={() => discardAndDraw('discard_first')}
            className="text-yellow-300 text-xs hover:text-yellow-100"
          >
            {s.game.drawFromDeck}
          </button>
        )}
      </div>
    </div>
  );
}
