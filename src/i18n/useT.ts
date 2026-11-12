import { useCallback, useSyncExternalStore } from 'react';
import { translate, type Lang, type Strings } from './strings';

let currentLang: Lang = 'en';
const listeners = new Set<() => void>();

export function setLang(lang: Lang): void {
  if (lang === currentLang) return;
  currentLang = lang;
  listeners.forEach((l) => l());
}

export function getLang(): Lang {
  return currentLang;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useT(): {
  t: (key: keyof Strings) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
} {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  const t = useCallback((key: keyof Strings) => translate(lang, key), [lang]);
  return { t, lang, setLang };
}
