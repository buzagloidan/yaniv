import { motion } from 'framer-motion';
import { useStrings } from '../../strings';
import { useGameStore, selectCanCallYaniv, selectIsMyTurn } from '../../store/gameStore';

export function ActionBar() {
  const s = useStrings();
  const phase = useGameStore((s) => s.phase);
  const callYaniv = useGameStore((s) => s.callYaniv);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const canYaniv = useGameStore((s) => selectCanCallYaniv(s, s.yanivThreshold));

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
        className="flex items-center justify-center active:scale-95"
        style={{
          width: 176,
          height: 176,
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        initial={{ opacity: 0, scale: 0.88, y: 10 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: [1, 1.07, 1],
        }}
        exit={{ opacity: 0, scale: 0.88, y: 10 }}
        transition={{
          opacity: { duration: 0.3 },
          y: { duration: 0.3 },
          scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <img
          src="/yaniv-win.png"
          alt={s.game.callYaniv}
          style={{ width: 152, height: 152, objectFit: 'contain', pointerEvents: 'none' }}
        />
      </motion.button>
    </div>
  );
}
