import type { MatchRepo } from '../../db/types';

/** The slice of the repo the wizard needs; injectable for tests. */
export type SavedMatchSource = Pick<MatchRepo, 'listMatches' | 'loadMatch'>;

let repoPromise: Promise<MatchRepo> | null = null;

/** Lazily opens the native DB (required inside so tests never load expo-sqlite). */
export function openSavedMatchSource(): Promise<MatchRepo> {
  repoPromise ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('../../db') as typeof import('../../db');
    const database = await db.openExpoDatabase();
    await db.initDb(database);
    return db.createMatchRepo(database);
  })();
  return repoPromise;
}
