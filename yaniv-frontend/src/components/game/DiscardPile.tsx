import { motion, AnimatePresence } from 'framer-motion';
import { CardView } from './CardView';
import { useGameStore, selectCanDraw } from '../../store/gameStore';
import { he } from '../../strings/he';

export function DiscardPile() {
  const discardPile = useGameStore((s) => s.discardPile);
  const draw = useGameStore((s) => s.draw);
  const canDraw = useGameStore(selectCanDraw);

  const { currentSet, deckCount } = discardPile;
  const canDrawFromDiscard = canDraw && currentSet.length > 0;

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Draw pile */}
      <div className="flex flex-col items-center gap-2">
        <motion.div
          className="relative cursor-pointer"
          whileHover={canDraw ? { scale: 1.05 } : undefined}
          whileTap={canDraw ? { scale: 0.97 } : undefined}
          onClick={() => canDraw && draw('deck')}
        >
          {/* Stack effect — 3 offset backs */}
          {[2, 1, 0].map((offset) => (
            <div
              key={offset}
              className={[
                'absolute rounded-lg bg-emerald-800 border border-emerald-600/40',
                offset > 0 ? 'opacity-60' : '',
              ].join(' ')}
              style={{
                width: 64, height: 96,
                top: -offset * 1.5,
                left: -offset * 1.5,
                zIndex: 3 - offset,
              }}
            />
          ))}
          <div
            className={[
              'relative z-10 w-16 h-24 rounded-lg bg-emerald-800 border-2 flex items-center justify-center transition-colors',
              canDraw ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-emerald-600/40',
            ].join(' ')}
          >
            <span className="text-white/30 text-2xl">✦</span>
          </div>
        </motion.div>
        <span className="text-white/50 text-xs">{he.game.cardsLeft(deckCount)}</span>
        {canDraw && (
          <button
            onClick={() => draw('deck')}
            className="text-yellow-300 text-xs hover:text-yellow-100 transition-colors"
          >
            {he.game.drawFromDeck}
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
                const canDrawThis = canDrawFromDiscard && (isFirst || isLast);

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
                      onClick={canDrawThis ? () => draw(isFirst ? 'discard_first' : 'discard_last') : undefined}
                      className={canDrawThis ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent' : ''}
                    />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
        {canDrawFromDiscard && currentSet.length > 1 && (
          <div className="flex gap-3 text-xs text-yellow-300">
            <button onClick={() => draw('discard_first')} className="hover:text-yellow-100">
              {he.game.drawFirst}
            </button>
            <button onClick={() => draw('discard_last')} className="hover:text-yellow-100">
              {he.game.drawLast}
            </button>
          </div>
        )}
        {canDrawFromDiscard && currentSet.length === 1 && (
          <button
            onClick={() => draw('discard_first')}
            className="text-yellow-300 text-xs hover:text-yellow-100"
          >
            {he.game.drawFromDeck /* reuse — means "draw from pile" */}
          </button>
        )}
      </div>
    </div>
  );
}
