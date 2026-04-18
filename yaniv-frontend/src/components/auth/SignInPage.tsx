import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { usePostHog } from '@posthog/react';

/* ── SVG Decorations ── */

function PalmTree({ flipped = false, className = '' }: { flipped?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 80 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: flipped ? 'scaleX(-1)' : undefined }}
    >
      {/* Trunk */}
      <path
        d="M38 175 Q34 140 36 110 Q34 85 38 60 Q40 85 44 110 Q42 140 42 175Z"
        fill="#92400E" opacity="0.6"
      />
      {/* Big fronds */}
      <path d="M38 68 Q10 40 0 10 Q18 38 36 50Z" fill="#16A34A" opacity="0.85" />
      <path d="M38 68 Q68 35 80 8 Q62 36 42 50Z" fill="#16A34A" opacity="0.85" />
      <path d="M38 68 Q30 30 38 0 Q42 30 42 50Z" fill="#15803D" opacity="0.9" />
      <path d="M38 68 Q5 55 0 38 Q18 52 36 58Z" fill="#22C55E" opacity="0.7" />
      <path d="M38 68 Q72 50 80 38 Q62 52 42 58Z" fill="#22C55E" opacity="0.7" />
      <path d="M38 68 Q15 70 2 62 Q18 66 36 65Z" fill="#4ADE80" opacity="0.6" />
      <path d="M38 68 Q60 70 76 62 Q60 66 42 65Z" fill="#4ADE80" opacity="0.6" />
    </svg>
  );
}

function Waves() {
  return (
    <div className="absolute bottom-0 inset-x-0 overflow-hidden" style={{ height: '180px' }}>
      {/* Repeating wave strips so animation is seamless */}
      <div className="animate-wave-move" style={{ width: '200%', position: 'absolute', bottom: 0, display: 'flex' }}>
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" style={{ width: '50%', height: 180, flexShrink: 0 }}>
          <path d="M0,60 C180,100 360,20 540,60 C720,100 900,20 1080,60 C1260,100 1350,80 1440,60 L1440,180 L0,180Z" fill="#BAE6FD" opacity="0.5" />
          <path d="M0,90 C200,50 400,120 600,90 C800,60 1000,120 1200,90 C1320,75 1390,85 1440,80 L1440,180 L0,180Z" fill="#7DD3FC" opacity="0.4" />
          <path d="M0,120 C240,90 480,150 720,120 C960,90 1200,150 1440,120 L1440,180 L0,180Z" fill="#38BDF8" opacity="0.35" />
          <path d="M0,150 C300,130 600,165 900,148 C1100,136 1300,155 1440,145 L1440,180 L0,180Z" fill="#0EA5E9" opacity="0.25" />
        </svg>
        {/* duplicate for seamless loop */}
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" style={{ width: '50%', height: 180, flexShrink: 0 }}>
          <path d="M0,60 C180,100 360,20 540,60 C720,100 900,20 1080,60 C1260,100 1350,80 1440,60 L1440,180 L0,180Z" fill="#BAE6FD" opacity="0.5" />
          <path d="M0,90 C200,50 400,120 600,90 C800,60 1000,120 1200,90 C1320,75 1390,85 1440,80 L1440,180 L0,180Z" fill="#7DD3FC" opacity="0.4" />
          <path d="M0,120 C240,90 480,150 720,120 C960,90 1200,150 1440,120 L1440,180 L0,180Z" fill="#38BDF8" opacity="0.35" />
          <path d="M0,150 C300,130 600,165 900,148 C1100,136 1300,155 1440,145 L1440,180 L0,180Z" fill="#0EA5E9" opacity="0.25" />
        </svg>
      </div>
    </div>
  );
}

function SunRays() {
  return (
    <svg viewBox="0 0 300 300" className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
      {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map((angle, i) => (
        <line
          key={i}
          x1="150" y1="150"
          x2={150 + Math.cos((angle * Math.PI) / 180) * 200}
          y2={150 + Math.sin((angle * Math.PI) / 180) * 200}
          stroke="#FCD34D"
          strokeWidth="1.5"
        />
      ))}
      <circle cx="150" cy="150" r="40" fill="#FDE68A" />
    </svg>
  );
}

export function SignInPage() {
  const { devSignIn, loading, error, clearError, user } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const posthog = usePostHog();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await devSignIn(name.trim());
    const signedInUser = useAuthStore.getState().user;
    if (signedInUser) {
      posthog?.identify(signedInUser.userId, { display_name: signedInUser.displayName });
      posthog?.capture('user_signed_in', { method: 'dev' });
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden p-4"
      style={{
        background: 'linear-gradient(160deg, #E0F2FE 0%, #F0F9FF 30%, #FDFAF3 65%, #FEF3C7 100%)',
      }}
    >
      {/* Sun rays in top-right corner */}
      <div className="absolute top-[-60px] right-[-60px] w-80 h-80 opacity-30 animate-drift pointer-events-none">
        <SunRays />
      </div>

      {/* Palm trees */}
      <div className="absolute bottom-32 left-4 w-24 opacity-80 animate-sway pointer-events-none" style={{ animationDuration: '5s' }}>
        <PalmTree />
      </div>
      <div className="absolute bottom-24 right-6 w-20 opacity-70 animate-sway pointer-events-none" style={{ animationDuration: '6s', animationDelay: '-2s' }}>
        <PalmTree flipped />
      </div>
      <div className="absolute bottom-36 left-20 w-14 opacity-50 animate-sway pointer-events-none" style={{ animationDuration: '7s', animationDelay: '-1s' }}>
        <PalmTree />
      </div>

      {/* Floating card icons in background */}
      {['🌊', '🐚', '⚓', '🌺'].map((emoji, i) => (
        <motion.div
          key={emoji}
          className="absolute text-2xl opacity-20 pointer-events-none select-none"
          style={{
            top: `${15 + i * 18}%`,
            left: i % 2 === 0 ? `${8 + i * 3}%` : undefined,
            right: i % 2 !== 0 ? `${6 + i * 2}%` : undefined,
          }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Animated waves at bottom */}
      <Waves />

      {/* ── Main card ── */}
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Postcard-style card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 60px rgba(14, 116, 144, 0.18), 0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid rgba(255,255,255,0.9)',
          }}
        >
          {/* Ocean-band header */}
          <div
            className="relative flex flex-col items-center pt-8 pb-6 px-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)' }}
          >
            {/* Subtle wave in header */}
            <svg viewBox="0 0 320 40" className="absolute bottom-0 inset-x-0 w-full" style={{ height: 28 }}>
              <path d="M0,20 C80,40 160,0 240,20 C280,30 310,25 320,20 L320,40 L0,40Z" fill="white" opacity="0.15" />
              <path d="M0,30 C60,15 120,38 180,30 C240,22 290,35 320,28 L320,40 L0,40Z" fill="white" opacity="0.1" />
            </svg>

            {/* Logo */}
            <motion.img
              src="/yaniv-logo.webp"
              alt="יניב"
              className="w-40 h-auto object-contain mb-2 drop-shadow-lg"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'backOut' }}
            />
            <p className="text-sky-200 text-sm mt-1 opacity-90">משחק קלפים מרובה שחקנים</p>
          </div>

          {/* Form body */}
          <div className="px-7 py-7">
            <p className="text-center text-sm font-medium mb-5" style={{ color: '#2D4F7C' }}>
              הזינו שם כדי להתחיל לשחק 🌴
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם תצוגה"
                maxLength={20}
                autoFocus
                className="w-full rounded-2xl px-4 py-3 text-center text-base outline-none transition-all duration-200"
                style={{
                  background: '#F5E6C8',
                  border: '2px solid transparent',
                  color: '#1A3352',
                  fontFamily: 'Noto Sans Hebrew, sans-serif',
                }}
                onFocus={e => (e.target.style.borderColor = '#F26419')}
                onBlur={e => (e.target.style.borderColor = 'transparent')}
              />
              <ErrorBanner message={error} onDismiss={clearError} />
              <Button
                type="submit"
                size="lg"
                disabled={!name.trim() || loading}
                className="w-full mt-1"
              >
                {loading ? 'נכנסים...' : 'כניסה למשחק 🌊'}
              </Button>
            </form>
          </div>
        </div>

        {/* Tagline below card */}
        <p className="text-center mt-4 text-xs" style={{ color: '#2D4F7C', opacity: 0.5 }}>
          שחקו, תרגישו חופשה 🏝
        </p>
      </motion.div>
    </div>
  );
}
