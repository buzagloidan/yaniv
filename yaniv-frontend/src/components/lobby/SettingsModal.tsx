import { motion, AnimatePresence } from 'framer-motion';
import { useLangStore } from '../../store/langStore';
import { useState } from 'react';
import { AboutModal } from './AboutModal';
import { PrivacyModal } from './PrivacyModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onShowRules: () => void;
  onSignOut: () => void;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: on ? '#0891B2' : 'rgba(0,0,0,0.15)' }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow"
        style={{ left: on ? 'calc(100% - 20px)' : 4 }}
      />
    </button>
  );
}

function SettingsRow({
  icon,
  label,
  children,
  onClick,
}: {
  icon: string;
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !children}
      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-colors disabled:cursor-default"
      style={{ textAlign: 'right' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl w-7 text-center">{icon}</span>
        <span
          className="text-base font-medium"
          style={{ color: '#1A3352', fontFamily: 'Noto Sans Hebrew, sans-serif' }}
        >
          {label}
        </span>
      </div>
      {children ?? (onClick ? <span style={{ color: '#7C6A50' }}>›</span> : null)}
    </button>
  );
}

export function SettingsModal({ open, onClose, onShowRules, onSignOut }: Props) {
  const { lang, setLang } = useLangStore();
  const isEn = lang === 'en';

  const [soundsOn, setSoundsOn] = useState(() => {
    try { return localStorage.getItem('yaniv_sounds') !== 'off'; } catch { return true; }
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const toggleSounds = () => {
    const next = !soundsOn;
    setSoundsOn(next);
    try { localStorage.setItem('yaniv_sounds', next ? 'on' : 'off'); } catch { /* ignore */ }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
            />

            <motion.div
              className="relative z-10 w-full max-w-md rounded-t-3xl pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              style={{
                background: '#FFFBF0',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
              }}
              dir="rtl"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: '#E2C99A' }} />
              </div>

              {/* Title */}
              <div className="px-6 pb-3 pt-1 flex items-center justify-between">
                <h2
                  className="text-lg font-bold"
                  style={{ color: '#1A3352', fontFamily: 'Syne, sans-serif' }}
                >
                  {isEn ? 'Settings' : 'הגדרות'}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ background: '#F5E6C8', color: '#7C5533' }}
                >
                  ✕
                </button>
              </div>

              <div className="mx-4 h-px" style={{ background: '#E2C99A' }} />

              {/* Toggles */}
              <div className="px-2 pt-2 space-y-0.5">
                <SettingsRow icon="🔊" label={isEn ? 'Sounds' : 'צלילים'}>
                  <Toggle on={soundsOn} onToggle={toggleSounds} />
                </SettingsRow>
                <SettingsRow
                  icon="🌐"
                  label={isEn ? 'Language: English' : 'שפה: עברית'}
                >
                  <Toggle
                    on={isEn}
                    onToggle={() => setLang(isEn ? 'he' : 'en')}
                  />
                </SettingsRow>
              </div>

              <div className="mx-4 my-2 h-px" style={{ background: '#E2C99A' }} />

              {/* Nav items */}
              <div className="px-2 space-y-0.5">
                <SettingsRow
                  icon="📖"
                  label={isEn ? 'Game Rules' : 'חוקי המשחק'}
                  onClick={() => { onClose(); onShowRules(); }}
                />
                <SettingsRow
                  icon="ℹ️"
                  label={isEn ? 'About' : 'אודות'}
                  onClick={() => setShowAbout(true)}
                />
                <SettingsRow
                  icon="🔒"
                  label={isEn ? 'Privacy Policy' : 'מדיניות פרטיות'}
                  onClick={() => setShowPrivacy(true)}
                />
                <SettingsRow
                  icon="💬"
                  label={isEn ? 'Support' : 'תמיכה'}
                  onClick={() => { window.location.href = 'mailto:support@yaniv.app'; }}
                />
              </div>

              <div className="mx-4 my-2 h-px" style={{ background: '#E2C99A' }} />

              {/* Sign out */}
              <div className="px-2">
                <button
                  onClick={() => { onClose(); onSignOut(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl"
                >
                  <span className="text-xl w-7 text-center">🚪</span>
                  <span
                    className="text-base font-medium"
                    style={{ color: '#B91C1C', fontFamily: 'Noto Sans Hebrew, sans-serif' }}
                  >
                    {isEn ? 'Sign Out' : 'התנתק'}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-modals rendered outside the sheet so they stack on top */}
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <PrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
}
