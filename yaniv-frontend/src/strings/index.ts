import { he } from './he';
import { en } from './en';
import { useLangStore } from '../store/langStore';

export type Strings = typeof he;

/** Use inside React components */
export function useStrings(): Strings {
  const lang = useLangStore((s) => s.lang);
  return (lang === 'en' ? en : he) as unknown as Strings;
}

/** Use outside React (stores, utils) — reads localStorage directly */
export function getStrings(): Strings {
  try {
    const lang = localStorage.getItem('yaniv_lang');
    return (lang === 'en' ? en : he) as unknown as Strings;
  } catch {
    return he;
  }
}
