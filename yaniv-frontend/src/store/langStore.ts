import { create } from 'zustand';

export type Lang = 'he' | 'en';

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem('yaniv_lang');
    return stored === 'en' ? 'en' : 'he';
  } catch {
    return 'he';
  }
}

function applyLang(lang: Lang) {
  document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
}

// Apply on initial load
applyLang(getInitialLang());

export const useLangStore = create<LangStore>((set) => ({
  lang: getInitialLang(),
  setLang: (lang) => {
    try { localStorage.setItem('yaniv_lang', lang); } catch { /* ignore */ }
    applyLang(lang);
    set({ lang });
  },
}));
