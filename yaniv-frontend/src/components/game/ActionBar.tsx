import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStrings } from '../../strings';
import { useGameStore, selectCanCallYaniv, selectIsMyTurn } from '../../store/gameStore';

const DEFAULT_THRESHOLD = 7;

export function ActionBar() {
  const s = useStrings();
  const phase = useGameStore((s) => s.phase);
  const callYaniv = useGameStore((s) => s.callYaniv);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const canYaniv = useGameStore((s) => selectCanCallYaniv(s, DEFAULT_THRESHOLD));
  const [showConfirm, setShowConfirm] = useState(false);

  if (phase === 'waiting_for_players') {
    return null;
  }

  if (!isMyTurn || phase !== 'player_turn_discard') {
    return null;
  }

  if (!canYaniv) {
    return null;
  }

  return (
    <div className="absolute bottom-36 start-3 z-20">
      <AnimatePresence mode="wait">
        {showConfirm ? (
          <motion.div
            key="yaniv-confirm"
            initial={{ opacity: 0, scale: 0.88, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 8 }}
            className="rounded-2xl px-3 py-3 min-w-[140px]"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 12px 32px rgba(12,74,110,0.18)',
              border: '1px solid rgba(242,100,25,0.22)',
            }}
          >
            <p className="text-xs font-semibold text-center mb-2.5" style={{ color: '#7C5533' }}>
              {s.game.yanivConfirm}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { callYaniv(); setShowConfirm(false); }}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-opacity active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #F26419, #D9560E)',
                  color: '#FFFBF0',
                }}
              >
                {s.game.yanivYes}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold"
                style={{
                  background: 'rgba(12,74,110,0.08)',
                  color: '#0C4A6E',
                  border: '1px solid rgba(12,74,110,0.12)',
                }}
              >
                {s.game.yanivCancel}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="yaniv-action"
            onClick={() => setShowConfirm(true)}
            aria-label={s.game.callYaniv}
            title={s.game.callYaniv}
            className="flex h-11 w-11 items-center justify-center rounded-xl border text-[1.35rem] shadow-lg transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(242,100,25,0.96), rgba(217,86,14,0.94))',
              color: '#FFF7ED',
              borderColor: 'rgba(255,255,255,0.2)',
              boxShadow: '0 14px 30px rgba(242,100,25,0.28)',
            }}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{
              opacity: 1, scale: 1, y: [0, -2, 0],
              boxShadow: [
                '0 14px 30px rgba(242,100,25,0.24)',
                '0 18px 36px rgba(242,100,25,0.36)',
                '0 14px 30px rgba(242,100,25,0.24)',
              ],
            }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span aria-hidden="true">📣</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
