import { he } from './he';
import { en } from './en';
import { ar } from './ar';
import { ru } from './ru';
import { useLangStore } from '../store/langStore';

export type Strings = typeof he;

function getLangStrings(lang: string | null) {
  if (lang === 'en') return en;
  if (lang === 'ar') return ar;
  if (lang === 'ru') return ru;
  return he;
}

/** Use inside React components */
export function useStrings(): Strings {
  const lang = useLangStore((s) => s.lang);
  return getLangStrings(lang) as unknown as Strings;
}

/** Use outside React (stores, utils) — reads localStorage directly */
export function getStrings(): Strings {
  try {
    return getLangStrings(localStorage.getItem('yaniv_lang')) as unknown as Strings;
  } catch {
    return he;
  }
}
