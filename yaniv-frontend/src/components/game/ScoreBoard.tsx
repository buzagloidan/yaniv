import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStrings } from '../../strings';

export function ScoreBoard() {
  const s = useStrings();
  const players = useGameStore((s) => s.players);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const roomCode = useGameStore((s) => s.roomCode);
  const isPrivateTable = useGameStore((s) => s.isPrivateTable);
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
    <div className="absolute bottom-3 end-3 z-20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'none', border: 'none', padding: 0 }}
        aria-label={s.game.score}
        title={s.game.score}
      >
        <img src="/paper_asset_ratio_fixed.png" alt="" aria-hidden="true" style={{ width: 44, height: 44, objectFit: 'contain' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-12 end-0 bg-gray-900/95 border border-white/10 rounded-2xl p-4 min-w-[200px] shadow-2xl"
          >
            {roundNumber > 0 && (
              <div className="text-white/45 text-xs text-center mb-3">
                {s.game.round(roundNumber)}
              </div>
            )}
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

            {roomCode && !isPrivateTable && (
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
