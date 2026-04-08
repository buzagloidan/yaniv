import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
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
    <div className="flex flex-col items-center">
      <motion.div
        key="actions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center"
      >
        <Button
          size="lg"
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 animate-pulse"
          onClick={callYaniv}
        >
          {s.game.callYaniv}
        </Button>
      </motion.div>
    </div>
  );
}
