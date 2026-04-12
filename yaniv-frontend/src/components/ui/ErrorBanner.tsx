import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onDismiss, className = '' }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm ${className}`}
          style={{
            background: 'rgba(255, 237, 237, 0.97)',
            border: '1px solid rgba(239, 68, 68, 0.22)',
            color: '#9B1C1C',
            boxShadow: '0 4px 20px rgba(185, 28, 28, 0.12), 0 1px 4px rgba(185,28,28,0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            <circle cx="8" cy="8" r="7.25" stroke="#EF4444" strokeWidth="1.5" />
            <path d="M8 5v3.5" stroke="#EF4444" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.85" fill="#EF4444" />
          </svg>

          <span
            style={{
              flex: 1,
              fontFamily: 'Noto Sans Hebrew, sans-serif',
              lineHeight: 1.55,
              direction: 'rtl',
            }}
          >
            {message}
          </span>

          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="סגור"
              className="flex-shrink-0 transition-opacity opacity-40 hover:opacity-80 active:scale-90"
              style={{ marginTop: 3 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M1 1l10 10M11 1L1 11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
