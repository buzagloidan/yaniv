import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function ToastContainer() {
  const toasts = useGameStore((s) => s.toasts);
  const removeToast = useGameStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => removeToast(t.id)}
            className={[
              'pointer-events-auto px-5 py-2.5 rounded-xl text-sm font-medium shadow-xl cursor-pointer',
              t.kind === 'error'
                ? 'bg-red-600 text-white'
                : t.kind === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-white border border-white/10',
            ].join(' ')}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
