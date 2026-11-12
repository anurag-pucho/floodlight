import type { Database } from './types';

export const SCHEMA_VERSION = 1;

export const CREATE_MATCHES_SQL = `CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY NOT NULL,
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  overs INTEGER NOT NULL,
  status TEXT NOT NULL,
  state_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`;

export const CREATE_MATCHES_INDEX_SQL =
  'CREATE INDEX IF NOT EXISTS idx_matches_status_updated ON matches (status, updated_at)';

/** Idempotent: safe to call on every app start. */
export async function initDb(db: Database): Promise<void> {
  await db.exec(CREATE_MATCHES_SQL);
  await db.exec(CREATE_MATCHES_INDEX_SQL);
}
