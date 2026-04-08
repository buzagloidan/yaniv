import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { useStrings } from '../../strings';

interface Props {
  open: boolean;
}

export function NicknameGate({ open }: Props) {
  const s = useStrings();
  const { devSignIn, loading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    clearError();
  }, [open, clearError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    void devSignIn(trimmed);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="relative z-10 w-full max-w-sm rounded-[2rem] overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 28px 80px rgba(12,74,110,0.22)',
              border: '1px solid rgba(255,255,255,0.92)',
            }}
          >
            <div
              className="px-7 pt-7 pb-6 text-center"
              style={{ background: 'linear-gradient(135deg, #0891B2 0%, #0C4A6E 100%)' }}
            >
              <motion.img
                src="/yaniv-logo.png"
                alt="יניב"
                className="w-36 sm:w-40 h-auto object-contain mx-auto mb-2"
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.35 }}
              />
              <p className="text-sky-100 text-sm mt-2 opacity-95">
                {s.auth.nicknamePrompt}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-7 py-6 flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) clearError();
                }}
                placeholder={s.auth.devName}
                maxLength={20}
                autoFocus
                className="w-full rounded-2xl px-4 py-3 text-center text-base outline-none transition-all duration-200"
                style={{
                  background: '#F5E6C8',
                  border: '2px solid transparent',
                  color: '#1A3352',
                  fontFamily: 'Noto Sans Hebrew, sans-serif',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#F26419'; }}
                onBlur={(e) => { e.target.style.borderColor = 'transparent'; }}
              />

              {error && (
                <p className="text-sm text-center" style={{ color: '#B91C1C' }}>
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={!name.trim() || loading}
                className="w-full mt-1"
              >
                {loading ? s.auth.signingIn : s.auth.devEnter}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
