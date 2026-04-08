import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { useStrings } from '../../strings';
import { addBot } from '../../networking/api';
import { useAuthStore } from '../../store/authStore';
import { useGameStore, selectCanDiscard, selectCanCallYaniv, selectIsMyTurn } from '../../store/gameStore';

const DEFAULT_THRESHOLD = 7;

export function ActionBar() {
  const s = useStrings();
  const phase = useGameStore((s) => s.phase);
  const roomCode = useGameStore((s) => s.roomCode);
  const discard = useGameStore((s) => s.discard);
  const callYaniv = useGameStore((s) => s.callYaniv);
  const readyUp = useGameStore((s) => s.readyUp);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const canDiscard = useGameStore(selectCanDiscard);
  const isMyTurn = useGameStore(selectIsMyTurn);
  const canYaniv = useGameStore((s) => selectCanCallYaniv(s, DEFAULT_THRESHOLD));
  const addToast = useGameStore((s) => s.addToast);

  const user = useAuthStore((s) => s.user);

  const [showYanivConfirm, setShowYanivConfirm] = useState(false);
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [botCount, setBotCount] = useState(1);
  const [addingBot, setAddingBot] = useState(false);

  const handleAddBot = async () => {
    if (!user || !roomCode) return;
    setAddingBot(true);
    try {
      await addBot(user.sessionToken, roomCode, botCount);
      setShowBotPanel(false);
    } catch (e) {
      addToast((e as Error).message ?? 'שגיאה בהוספת בוט', 'error');
    } finally {
      setAddingBot(false);
    }
  };

  if (phase === 'waiting_for_players') {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <Button size="lg" onClick={readyUp} className="w-full">
          {s.game.startGame}
        </Button>

        <button
          onClick={() => setShowBotPanel(v => !v)}
          className="text-sm font-medium transition-colors"
          style={{ color: '#0891B2' }}
        >
          {showBotPanel ? '▲ סגור' : '🤖 הוסף בוט למשחק'}
        </button>

        <AnimatePresence>
          {showBotPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden w-full"
            >
              <div
                className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)' }}
              >
                <p className="text-sm text-center font-medium" style={{ color: '#0E7490' }}>
                  כמה בוטים להוסיף?
                </p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setBotCount(n)}
                      className="w-10 h-10 rounded-xl font-bold text-base transition-all"
                      style={{
                        background: botCount === n ? '#0891B2' : 'white',
                        color: botCount === n ? 'white' : '#0891B2',
                        border: `2px solid ${botCount === n ? '#0891B2' : '#BAE6FD'}`,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ocean"
                  size="md"
                  onClick={handleAddBot}
                  disabled={addingBot}
                  className="w-full"
                >
                  {addingBot ? 'מוסיף...' : `הוסף ${botCount} בוט${botCount > 1 ? 'ים' : ''} 🤖`}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!isMyTurn || (phase !== 'player_turn_discard' && phase !== 'player_turn_draw')) {
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
            className="flex gap-3"
          >
            {phase === 'player_turn_discard' && (
              <>
                <Button size="lg" disabled={!canDiscard} onClick={discard}>
                  {s.game.discard}
                  {selectedCards.length > 0 && ` (${selectedCards.length})`}
                </Button>
                {canYaniv && (
                  <Button
                    size="lg"
                    className="bg-amber-500 hover:bg-amber-400 text-gray-900 animate-pulse"
                    onClick={() => setShowYanivConfirm(true)}
                  >
                    {s.game.callYaniv}
                  </Button>
                )}
              </>
            )}
            {phase === 'player_turn_draw' && (
              <motion.p
                key="draw-hint"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium px-4 py-2 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(8px)',
                  color: '#0E7490',
                  border: '1.5px solid rgba(8,145,178,0.3)',
                }}
              >
                🃏 משוך קלף מהערימה או מהשלכה
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
