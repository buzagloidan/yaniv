import { motion, AnimatePresence } from 'framer-motion';
import { useLangStore } from '../../store/langStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: Props) {
  const lang = useLangStore((s) => s.lang);
  const isEn = lang === 'en';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: '#FFFBF0', border: '1px solid rgba(226,201,154,0.7)' }}
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 24 }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #0891B2, #0C4A6E)' }}
            >
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {isEn ? 'About Yaniv 🏝' : 'אודות יניב 🏝'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div
              className="px-5 py-5 space-y-4 text-sm leading-relaxed"
              dir={isEn ? 'ltr' : 'rtl'}
              style={{ color: '#3D2B1F', textAlign: isEn ? 'left' : 'right' }}
            >
              {/* Logo area */}
              <div className="flex flex-col items-center gap-2 py-3">
                <div className="text-5xl">🌴</div>
                <p className="text-xl font-bold" style={{ color: '#0C4A6E', fontFamily: 'Syne, sans-serif' }}>
                  יניב — Yaniv
                </p>
                <p className="text-xs" style={{ color: '#7C6A50' }}>v1.0</p>
              </div>

              {isEn ? (
                <>
                  <p>
                    <strong>Yaniv</strong> is a beloved Israeli card game — fast-paced, strategic, and perfect for a lazy afternoon on the beach. ☀️
                  </p>
                  <p>
                    This app brings the classic experience online with real-time multiplayer, bot opponents, and a tropical vacation vibe.
                  </p>
                  <p>
                    Built with ❤️ for card game lovers everywhere. Play, relax, feel the breeze. 🌊
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>יניב</strong> הוא משחק קלפים ישראלי אהוב — מהיר, אסטרטגי, ומושלם לצהריים עצלן על החוף. ☀️
                  </p>
                  <p>
                    האפליקציה הזו מביאה את החוויה הקלאסית לאונליין עם מולטיפלייר בזמן אמת, יריבים בוטים, ואווירה של חופשה טרופית.
                  </p>
                  <p>
                    נבנה באהבה ❤️ לאוהבי משחקי קלפים בכל מקום. שחק, תירגע, תרגיש חופשה. 🌊
                  </p>
                </>
              )}

              <div
                className="rounded-2xl px-4 py-3 text-center text-xs"
                style={{ background: '#E0F2FE', color: '#0E7490' }}
              >
                {isEn
                  ? '© 2025 Yaniv App. All rights reserved.'
                  : '© 2025 יניב אפ. כל הזכויות שמורות.'}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
