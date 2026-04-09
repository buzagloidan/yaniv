import { motion } from 'framer-motion';
import { useStrings } from '../../strings';
import { useGameStore, selectCanCallYaniv, selectIsMyTurn } from '../../store/gameStore';

const DEFAULT_THRESHOLD = 7;

export function ActionBar() {
  const s = useStrings();
  const phase = useGameStore((s) => s.phase);
  const callYaniv = useGameStore((s) => s.callYaniv);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const canYaniv = useGameStore((s) => selectCanCallYaniv(s, DEFAULT_THRESHOLD));

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
      <motion.button
        onClick={callYaniv}
        aria-label={s.game.callYaniv}
        title={s.game.callYaniv}
        className="flex items-center justify-center rounded-2xl border active:scale-95"
        style={{
          width: 64,
          height: 64,
          background: 'linear-gradient(135deg, rgba(242,100,25,0.96), rgba(217,86,14,0.94))',
          borderColor: 'rgba(255,255,255,0.25)',
          boxShadow: '0 14px 30px rgba(242,100,25,0.35)',
          padding: 6,
        }}
        initial={{ opacity: 0, scale: 0.88, y: 10 }}
        animate={{
          opacity: 1,
          scale: [1, 1.07, 1],
          boxShadow: [
            '0 14px 30px rgba(242,100,25,0.30)',
            '0 20px 40px rgba(242,100,25,0.52)',
            '0 14px 30px rgba(242,100,25,0.30)',
          ],
        }}
        exit={{ opacity: 0, scale: 0.88, y: 10 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src="/yaniv-win.png"
          alt={s.game.callYaniv}
          style={{ width: 52, height: 52, objectFit: 'contain', pointerEvents: 'none' }}
        />
      </motion.button>
    </div>
  );
}
