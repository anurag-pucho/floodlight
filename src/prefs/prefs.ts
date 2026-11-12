import { useSyncExternalStore } from 'react';
import type { Scheme } from '../theme/tokens';
import type { Lang } from '../i18n/strings';

export interface Prefs {
  scheme: Scheme;
  lang: Lang;
  haptics: boolean;
}

export const DEFAULT_PREFS: Prefs = { scheme: 'dark', lang: 'en', haptics: true };

export const PREFS_KEY = 'floodlight.prefs.v1';

/** The slice of AsyncStorage we use; injectable so tests and failures stay isolated. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

function asyncStorage(): KeyValueStorage {
  // Required lazily so a missing native module only fails (and is caught) at call time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-async-storage/async-storage') as { default: KeyValueStorage };
  return mod.default;
}

const defaultStorage: KeyValueStorage = {
  getItem: (key) => asyncStorage().getItem(key),
  setItem: (key, value) => asyncStorage().setItem(key, value),
};

/** Validates unknown parsed JSON field by field; invalid fields fall back to defaults. */
function sanitize(raw: unknown): Prefs {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    scheme: o.scheme === 'dark' || o.scheme === 'light' ? o.scheme : DEFAULT_PREFS.scheme,
    lang: o.lang === 'en' || o.lang === 'hi' ? o.lang : DEFAULT_PREFS.lang,
    haptics: typeof o.haptics === 'boolean' ? o.haptics : DEFAULT_PREFS.haptics,
  };
}

export interface PrefsStore {
  get(): Prefs;
  /** Reads storage (never throws), updates state, notifies, and returns the result. */
  hydrate(): Promise<Prefs>;
  /** Merges a patch into state, notifies, then persists (never throws). */
  set(patch: Partial<Prefs>): Promise<void>;
  subscribe(cb: () => void): () => void;
}

export function createPrefsStore(storage: KeyValueStorage = defaultStorage): PrefsStore {
  let state: Prefs = DEFAULT_PREFS;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    get: () => state,
    async hydrate() {
      try {
        const text = await storage.getItem(PREFS_KEY);
        state = text ? sanitize(JSON.parse(text)) : DEFAULT_PREFS;
      } catch {
        state = DEFAULT_PREFS;
      }
      emit();
      return state;
    },
    async set(patch) {
      state = sanitize({ ...state, ...patch });
      emit();
      try {
        await storage.setItem(PREFS_KEY, JSON.stringify(state));
      } catch {
        // Storage unavailable: the preference still applies for this session.
      }
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}

export const prefsStore: PrefsStore = createPrefsStore();

export const hydratePrefs = (): Promise<Prefs> => prefsStore.hydrate();

export function usePrefs(store: PrefsStore = prefsStore): Prefs {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
