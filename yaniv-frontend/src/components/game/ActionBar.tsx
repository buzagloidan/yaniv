import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { useStrings } from '../../strings';
import { useGameStore, selectCanDiscardAndDraw, selectCanCallYaniv, selectIsMyTurn } from '../../store/gameStore';

const DEFAULT_THRESHOLD = 7;

export function ActionBar() {
  const s = useStrings();
  const phase = useGameStore((s) => s.phase);
  const callYaniv = useGameStore((s) => s.callYaniv);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const canDiscardAndDraw = useGameStore(selectCanDiscardAndDraw);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const canYaniv = useGameStore((s) => selectCanCallYaniv(s, DEFAULT_THRESHOLD));

  const [showYanivConfirm, setShowYanivConfirm] = useState(false);

  if (phase === 'waiting_for_players') {
    return null;
  }

  if (!isMyTurn || phase !== 'player_turn_discard') {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence mode="wait">
        {showYanivConfirm ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex gap-3"
          >
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-gray-900"
              onClick={() => { callYaniv(); setShowYanivConfirm(false); }}
            >
              {s.game.yanivYes}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setShowYanivConfirm(false)}>
              {s.game.yanivCancel}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            {/* Contextual hint */}
            <motion.p
              key={canDiscardAndDraw ? 'ready' : 'select'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium px-4 py-2 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(8px)',
                color: canDiscardAndDraw ? '#0E7490' : '#7C6A50',
                border: `1.5px solid ${canDiscardAndDraw ? 'rgba(8,145,178,0.3)' : 'rgba(226,201,154,0.4)'}`,
              }}
            >
              {canDiscardAndDraw
                ? `✓ בחר קלף מהשולחן או הערימה (${selectedCards.length} נבחרו)`
                : 'בחר קלפים להשלכה'}
            </motion.p>

            {canYaniv && (
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-400 text-gray-900 animate-pulse"
                onClick={() => setShowYanivConfirm(true)}
              >
                {s.game.callYaniv}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
