import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { he } from '../../strings/he';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (settings: {
    maxPlayers: number;
    yanivThreshold: number;
    turnTimeoutSeconds: number;
    isRanked: boolean;
  }) => Promise<void>;
}

export function CreateTableModal({ open, onClose, onCreate }: Props) {
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [threshold, setThreshold] = useState(7);
  const [isRanked, setIsRanked] = useState(false);
  const [blitz, setBlitz] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await onCreate({
        maxPlayers,
        yanivThreshold: isRanked ? 7 : threshold,
        turnTimeoutSeconds: blitz ? 10 : 30,
        isRanked,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={he.createTable.title}>
      <div className="space-y-4">
        {/* Max players */}
        <div>
          <label className="block text-white/70 text-sm mb-2">{he.createTable.maxPlayers}</label>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                className={[
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                  maxPlayers === n
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Yaniv threshold */}
        <div>
          <label className="block text-white/70 text-sm mb-2">
            {he.createTable.threshold}: {isRanked ? 7 : threshold}
          </label>
          <input
            type="range"
            min={5}
            max={9}
            value={isRanked ? 7 : threshold}
            disabled={isRanked}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-emerald-500 disabled:opacity-40"
          />
          {isRanked && (
            <p className="text-white/40 text-xs mt-1">{he.createTable.rankedNote}</p>
          )}
        </div>

        {/* Turn time */}
        <div>
          <label className="block text-white/70 text-sm mb-2">{he.createTable.turnTime}</label>
          <div className="flex gap-2">
            {([false, true] as const).map((b) => (
              <button
                key={String(b)}
                onClick={() => setBlitz(b)}
                className={[
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                  blitz === b
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10',
                ].join(' ')}
              >
                {b ? he.createTable.blitz : he.createTable.standard}
              </button>
            ))}
          </div>
        </div>

        {/* Ranked toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isRanked}
            onChange={(e) => setIsRanked(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          <span className="text-white/80 text-sm">{he.createTable.ranked}</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {he.createTable.cancel}
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="flex-1">
            {he.createTable.create}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
