import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useStrings } from '../../strings';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../analytics';

export function GameOverOverlay() {
  const s = useStrings();
  const gameOver = useGameStore((s) => s.gameOver);
  const players = useGameStore((s) => s.players);
  const tableId = useGameStore((s) => s.tableId);
  const disconnect = useGameStore((s) => s.disconnect);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const trackedGameKeyRef = useRef<string | null>(null);

  const iWon = gameOver?.winnerId === user?.userId;
  const sortedPlayers = gameOver
    ? [...players].sort((a, b) => {
        const scoreA = gameOver.finalScores[a.userId] ?? a.score;
        const scoreB = gameOver.finalScores[b.userId] ?? b.score;
        return scoreA - scoreB;
      })
    : players;

  useEffect(() => {
    if (!gameOver || !tableId) return;

    const gameKey = `${tableId}:${gameOver.winnerId}`;
    if (trackedGameKeyRef.current === gameKey) return;

    trackEvent('game_completed', {
      winner_id: gameOver.winnerId,
      winner_name: gameOver.winnerName,
      i_won: iWon,
      player_count: players.length,
    });
    trackedGameKeyRef.current = gameKey;
  }, [gameOver, iWon, players.length, tableId]);

  const handleLobby = () => {
    disconnect();
    navigate('/');
  };

  return (
    <AnimatePresence>
      {gameOver && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <motion.div
            className="relative z-10 bg-gray-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm mx-4 shadow-2xl text-center"
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }}
          >
            <div className="text-5xl mb-4">{iWon ? '🏆' : '😔'}</div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {s.gameOver.title}
            </h1>
            <p className={['text-xl mb-6', iWon ? 'text-yellow-400' : 'text-white/60'].join(' ')}>
              {iWon ? s.gameOver.youWon : s.gameOver.winner(gameOver.winnerName)}
            </p>

            {/* Standings */}
            <div className="space-y-2 mb-8 text-start">
              {sortedPlayers
                .map((p, i) => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-sm w-5">{i + 1}.</span>
                      <span className={['text-sm', p.isEliminated ? 'text-red-400 line-through' : 'text-white'].join(' ')}>
                        {p.displayName}
                        {p.userId === gameOver.winnerId && ' 🏆'}
                      </span>
                    </div>
                    <span className="text-white/50 text-sm font-mono">
                      {gameOver.finalScores[p.userId] ?? p.score}
                    </span>
                  </div>
                ))}
            </div>

            <Button size="lg" onClick={handleLobby} className="w-full">
              {s.gameOver.lobby}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
