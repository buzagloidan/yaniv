import { motion, AnimatePresence } from 'framer-motion';
import { CardView } from './CardView';
import { useGameStore } from '../../store/gameStore';
import { he } from '../../strings/he';
import { Button } from '../ui/Button';

export function RoundResultOverlay() {
  const result = useGameStore((s) => s.roundResult);
  const dismiss = useGameStore((s) => s.dismissRoundResult);
  const players = useGameStore((s) => s.players);

  const open = !!result;

  const getName = (id: string) =>
    players.find((p) => p.userId === id)?.displayName ?? id;

  return (
    <AnimatePresence>
      {open && result && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            className="relative z-10 bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-md mx-4 shadow-2xl"
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
          >
            {/* Title */}
            <div className="text-center mb-5">
              {result.callType === 'assaf' ? (
                <div>
                  <div className="text-3xl mb-1">💥</div>
                  <h2 className="text-2xl font-bold text-red-400">
                    {he.round.assaf(
                      getName(result.callerId),
                      getName(result.assafByIds[0] ?? ''),
                    )}
                  </h2>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-1">🎉</div>
                  <h2 className="text-2xl font-bold text-yellow-400">
                    {he.round.yanivCalled(getName(result.callerId))}
                  </h2>
                </div>
              )}
            </div>

            {/* All hands */}
            <div className="space-y-3 mb-5">
              {Object.entries(result.handsRevealed).map(([playerId, { cards, total }]) => {
                const delta = result.scoreDeltas[playerId] ?? 0;
                const newScore = result.newScores[playerId] ?? 0;
                const isElim = result.eliminatedThisRound.includes(playerId);
                const isReset = result.scoreResetApplied.includes(playerId);
                const isCaller = playerId === result.callerId;
                const isAssafer = result.assafByIds.includes(playerId);

                return (
                  <div
                    key={playerId}
                    className={[
                      'flex items-center gap-3 p-3 rounded-xl',
                      isCaller && result.callType === 'yaniv' ? 'bg-yellow-400/10 border border-yellow-400/20' : '',
                      isCaller && result.callType === 'assaf' ? 'bg-red-500/10 border border-red-500/20' : '',
                      isAssafer ? 'bg-emerald-500/10 border border-emerald-500/20' : '',
                      !isCaller && !isAssafer ? 'bg-white/5' : '',
                    ].join(' ')}
                  >
                    {/* Cards */}
                    <div className="flex gap-1 flex-shrink-0">
                      {cards.slice(0, 5).map((c) => (
                        <CardView key={c} cardId={c} small />
                      ))}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {getName(playerId)}
                        {isCaller && result.callType === 'yaniv' && ' 🎉'}
                        {isCaller && result.callType === 'assaf' && ' 💥'}
                      </div>
                      <div className="text-xs text-white/50">סכום: {total}</div>
                    </div>

                    {/* Score delta */}
                    <div className="text-end flex-shrink-0">
                      <div className={['font-bold', delta > 0 ? 'text-red-400' : 'text-green-400'].join(' ')}>
                        {delta > 0 ? `+${delta}` : '0'}
                        {isCaller && result.callType === 'assaf' && (
                          <span className="text-xs ms-1">{he.round.penalty}</span>
                        )}
                      </div>
                      <div className="text-xs text-white/40">
                        {isElim ? (
                          <span className="text-red-400">{he.game.eliminated}</span>
                        ) : isReset ? (
                          <span className="text-amber-400">{he.round.scoreReset}</span>
                        ) : (
                          <span>{newScore} נק׳</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={dismiss} className="w-full">
              המשך
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
