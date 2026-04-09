import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStrings } from '../../strings';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (settings: {
    yanivThreshold: number;
    scoreLimit: number;
  }) => Promise<void>;
}

function Spinner<T extends number>({
  label,
  options,
  value,
  onChange,
  suffix,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  suffix?: string;
}) {
  const idx = options.indexOf(value);
  const prev = () => onChange(options[(idx - 1 + options.length) % options.length]);
  const next = () => onChange(options[(idx + 1) % options.length]);

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span
        className="text-right font-medium text-base"
        style={{ color: '#E8D5B7', fontFamily: 'Noto Sans Hebrew, sans-serif', minWidth: 90 }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={prev}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#E8D5B7' }}
        >
          ➡️
        </button>
        <span
          className="w-16 text-center text-xl font-bold"
          style={{ color: '#FFFBF0', fontFamily: 'Syne, sans-serif' }}
        >
          {value}{suffix}
        </span>
        <button
          onClick={next}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#E8D5B7' }}
        >
          ⬅️
        </button>
      </div>
    </div>
  );
}

export function CreateTableModal({ open, onClose, onCreate }: Props) {
  const s = useStrings();
  const [threshold, setThreshold] = useState<1 | 3 | 5 | 7>(7);
  const [scoreLimit, setScoreLimit] = useState<50 | 100 | 200>(100);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await onCreate({ yanivThreshold: threshold, scoreLimit });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bamboo frame panel */}
          <motion.div
            className="relative z-10 w-full max-w-xs"
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {/* Outer bamboo border */}
            <div
              className="rounded-3xl p-1"
              style={{
                background: 'linear-gradient(135deg, #8B6914 0%, #C49A28 30%, #8B6914 60%, #C49A28 100%)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              {/* Bamboo corner joints */}
              {['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5'].map((pos, i) => (
                <div
                  key={i}
                  className={`absolute ${pos} w-5 h-5 rounded-full z-20`}
                  style={{ background: 'radial-gradient(circle, #C49A28, #6B4F10)' }}
                />
              ))}

              {/* Inner content */}
              <div
                className="rounded-3xl px-5 py-6"
                style={{
                  background: 'linear-gradient(160deg, #4A2E0A 0%, #3A2008 50%, #2E1A06 100%)',
                }}
              >
                {/* Title */}
                <div className="text-center mb-5">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: '#E8D5B7', fontFamily: 'Syne, sans-serif' }}
                  >
                    {s.createTable.title}
                  </h2>
                </div>

                {/* Divider */}
                <div className="h-px mb-4" style={{ background: 'rgba(232,213,183,0.2)' }} />

                {/* Spinners */}
                <div className="space-y-1">
                  <Spinner
                    label={s.createTable.threshold}
                    options={[1, 3, 5, 7] as (1 | 3 | 5 | 7)[]}
                    value={threshold}
                    onChange={setThreshold}
                  />
                  <div className="h-px" style={{ background: 'rgba(232,213,183,0.12)' }} />
                  <Spinner
                    label={s.createTable.pointsLimit}
                    options={[50, 100, 200] as (50 | 100 | 200)[]}
                    value={scoreLimit}
                    onChange={setScoreLimit}
                  />
                </div>

                {/* Divider */}
                <div className="h-px mt-4 mb-5" style={{ background: 'rgba(232,213,183,0.2)' }} />

                {/* Create button */}
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl text-base font-bold transition-all active:scale-95 disabled:opacity-60"
                  style={{
                    background: loading
                      ? 'rgba(242,100,25,0.5)'
                      : 'linear-gradient(135deg, #F26419 0%, #D9560E 100%)',
                    color: '#FFFBF0',
                    fontFamily: 'Syne, sans-serif',
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(242,100,25,0.4)',
                  }}
                >
                  {loading ? '...' : s.createTable.create}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
