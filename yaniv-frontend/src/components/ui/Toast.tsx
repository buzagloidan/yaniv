import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

const TOAST_STYLES: Record<string, { background: string; color: string; border: string; icon: string }> = {
  error: {
    background: 'rgba(255, 237, 237, 0.97)',
    color: '#9B1C1C',
    border: '1px solid rgba(239,68,68,0.22)',
    icon: '⚠️',
  },
  success: {
    background: 'rgba(236, 253, 245, 0.97)',
    color: '#065F46',
    border: '1px solid rgba(16,185,129,0.22)',
    icon: '✓',
  },
  info: {
    background: 'rgba(240, 249, 255, 0.97)',
    color: '#0C4A6E',
    border: '1px solid rgba(8,145,178,0.22)',
    icon: '🌊',
  },
};

export function ToastContainer() {
  const toasts = useGameStore((s) => s.toasts);
  const removeToast = useGameStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-72 max-w-[90vw]">
      <AnimatePresence>
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.kind] ?? TOAST_STYLES.info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              onClick={() => removeToast(t.id)}
              className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium cursor-pointer"
              style={{
                background: style.background,
                color: style.color,
                border: style.border,
                boxShadow: '0 8px 28px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                backdropFilter: 'blur(12px)',
                fontFamily: 'Noto Sans Hebrew, sans-serif',
                direction: 'rtl',
              }}
            >
              <span style={{ flexShrink: 0 }}>{style.icon}</span>
              <span style={{ flex: 1, lineHeight: 1.5 }}>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
