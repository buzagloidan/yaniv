import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStrings } from '../../strings';

export function ScoreBoard() {
  const s = useStrings();
  const players = useGameStore((s) => s.players);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const roomCode = useGameStore((s) => s.roomCode);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="absolute top-3 start-3 z-20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-white/70 text-sm flex items-center gap-2 transition-colors"
      >
        <span>📊</span>
        <span>{s.game.score}</span>
        {roundNumber > 0 && <span className="text-white/30">| {s.game.round(roundNumber)}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute top-10 start-0 bg-gray-900/95 border border-white/10 rounded-2xl p-4 min-w-[200px] shadow-2xl"
          >
            <div className="space-y-2 mb-4">
              {[...players]
                .sort((a, b) => a.score - b.score)
                .map((p) => (
                  <div key={p.userId} className="flex justify-between items-center gap-4">
                    <span
                      className={[
                        'text-sm truncate max-w-[120px]',
                        p.isEliminated ? 'text-red-400 line-through' : 'text-white',
                      ].join(' ')}
                    >
                      {p.displayName}
                    </span>
                    <span className={p.isEliminated ? 'text-red-400 text-sm' : 'text-white/80 text-sm font-mono'}>
                      {p.isEliminated ? s.game.eliminated : p.score}
                    </span>
                  </div>
                ))}
            </div>

            {roomCode && (
              <button
                onClick={copyCode}
                className="w-full text-center text-white/40 hover:text-white/70 text-xs border-t border-white/5 pt-3 transition-colors"
              >
                {copied ? s.game.copied : s.game.roomCode(roomCode)}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
