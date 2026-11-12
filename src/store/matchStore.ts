import { createStore, useStore } from 'zustand';
import {
  applyDelivery,
  createMatch,
  currentInningsIndex,
  editBall as engineEditBall,
  matchResult,
  redo as engineRedo,
  startNextInnings as engineStartNextInnings,
  teamTotal,
  undo as engineUndo,
  wicketsDown,
} from '../engine';
import type { MatchState } from '../engine';
import type { MatchStatus } from '../db/types';
import type { MatchStoreOptions, MatchStoreState, StoreRepo } from './types';

export type { MatchStoreOptions, MatchStoreState, StoreRepo } from './types';

const DEFAULT_DEBOUNCE_MS = 400;

/** Builds a store bound to an injectable repo. Engine stays the source of truth. */
export function createMatchStore(options: MatchStoreOptions) {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let repo: StoreRepo | null = null;
  const getRepo = (): StoreRepo => (repo ??= options.getRepo());

  const persist = (state: MatchState, status: MatchStatus): void => {
    getRepo()
      .saveMatch(state, status)
      .catch((e: unknown) => {
        console.warn('Floodlight: autosave failed', e);
      });
  };

  const store = createStore<MatchStoreState>((set, get) => {
    const cancelPending = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const scheduleSave = (): void => {
      cancelPending();
      timer = setTimeout(() => {
        timer = null;
        const s = get().state;
        if (s) persist(s, 'in_progress');
      }, debounceMs);
    };
    const mutate = (fn: (s: MatchState) => MatchState): void => {
      const cur = get().state;
      if (!cur) return;
      set({ state: fn(cur) });
      scheduleSave();
    };

    return {
      state: null,
      newMatch(config) {
        cancelPending();
        const s = createMatch(config);
        set({ state: s });
        persist(s, 'in_progress');
      },
      delivery: (input) => mutate((s) => applyDelivery(s, input)),
      undo: () => mutate(engineUndo),
      redo: () => mutate(engineRedo),
      editBall: (ballId, input) => mutate((s) => engineEditBall(s, ballId, input)),
      startNextInnings: () => mutate(engineStartNextInnings),
      async resume() {
        const found = await getRepo().getResumable();
        if (!found) return false;
        cancelPending();
        set({ state: found });
        return true;
      },
      async loadById(id) {
        const found = await getRepo().loadMatch(id);
        cancelPending();
        set({ state: found });
      },
      finishMatch() {
        const s = get().state;
        if (!s || !matchResult(s).decided) return;
        cancelPending();
        persist(s, 'complete');
      },
    };
  });

  return store;
}

/** Lazily opens the native DB once; required inside so tests never load expo-sqlite. */
let singletonRepo: StoreRepo | null = null;
function defaultRepo(): StoreRepo {
  if (singletonRepo) return singletonRepo;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('../db') as typeof import('../db');
  const ready: Promise<StoreRepo> = (async () => {
    const database = await db.openExpoDatabase();
    await db.initDb(database);
    return db.createMatchRepo(database);
  })();
  // Proxy that waits for the async init so callers keep a synchronous handle.
  singletonRepo = {
    saveMatch: async (s, st) => (await ready).saveMatch(s, st),
    loadMatch: async (id) => (await ready).loadMatch(id),
    getResumable: async () => (await ready).getResumable(),
  };
  return singletonRepo;
}

export const matchStore = createMatchStore({ getRepo: defaultRepo });

export function useMatchStore(): MatchStoreState;
export function useMatchStore<T>(selector: (s: MatchStoreState) => T): T;
export function useMatchStore<T>(selector?: (s: MatchStoreState) => T): T | MatchStoreState {
  return useStore(matchStore, selector ?? ((s) => s as unknown as T));
}

/** Derived score for the current innings, or null when no match is loaded. */
export function useScore(): { runs: number; wickets: number; inningsIndex: 0 | 1 } | null {
  const state = useMatchStore((s) => s.state);
  if (!state) return null;
  const idx = currentInningsIndex(state);
  return { runs: teamTotal(state, idx), wickets: wicketsDown(state, idx), inningsIndex: idx };
}
