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
    <motion.div
      key="yaniv-action"
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      className="absolute bottom-36 start-3 z-20"
    >
      <motion.button
        onClick={callYaniv}
        aria-label={s.game.callYaniv}
        title={s.game.callYaniv}
        className="flex h-11 w-11 items-center justify-center rounded-xl border text-[1.35rem] shadow-lg transition-transform active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(242,100,25,0.96), rgba(217,86,14,0.94))',
          color: '#FFF7ED',
          borderColor: 'rgba(255,255,255,0.2)',
          boxShadow: '0 14px 30px rgba(242,100,25,0.28)',
        }}
        animate={{ y: [0, -2, 0], boxShadow: [
          '0 14px 30px rgba(242,100,25,0.24)',
          '0 18px 36px rgba(242,100,25,0.36)',
          '0 14px 30px rgba(242,100,25,0.24)',
        ] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span aria-hidden="true">📣</span>
      </motion.button>
    </motion.div>
  );
}
