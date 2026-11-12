import type { MatchState } from '../../engine';
import type { MatchRepo } from '../../db/types';

/** Lazily opens the native DB (required inside so tests never load expo-sqlite). */
let repoPromise: Promise<MatchRepo> | null = null;
function openRepo(): Promise<MatchRepo> {
  repoPromise ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('../../db') as typeof import('../../db');
    const database = await db.openExpoDatabase();
    await db.initDb(database);
    return db.createMatchRepo(database);
  })();
  return repoPromise;
}

export type StatsLoader = () => Promise<MatchState[]>;

/** Every completed match, oldest first (so `aggregateCareers` keeps the latest player names). */
export async function loadCompletedMatches(repo?: MatchRepo): Promise<MatchState[]> {
  const r = repo ?? (await openRepo());
  const done = (await r.listMatches())
    .filter((s) => s.status === 'complete')
    .sort((a, b) => a.updatedAt - b.updatedAt);
  const states = await Promise.all(done.map((s) => r.loadMatch(s.id)));
  return states.filter((s): s is MatchState => s !== null);
}
