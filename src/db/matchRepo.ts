import type { MatchState } from '../engine';
import type { Database, MatchRepo, MatchStatus, MatchSummary } from './types';

interface SummaryRow {
  id: string;
  team_a_name: string;
  team_b_name: string;
  overs: number;
  status: string;
  updated_at: number;
}
interface StateRow { state_json: string }

export const UPSERT_SQL = `INSERT INTO matches
  (id, team_a_name, team_b_name, overs, status, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    team_a_name = excluded.team_a_name,
    team_b_name = excluded.team_b_name,
    overs = excluded.overs,
    status = excluded.status,
    state_json = excluded.state_json,
    updated_at = excluded.updated_at`;
export const SELECT_STATE_SQL = 'SELECT state_json FROM matches WHERE id = ?';
export const LIST_SQL =
  'SELECT id, team_a_name, team_b_name, overs, status, updated_at FROM matches ORDER BY updated_at DESC';
export const RESUMABLE_SQL =
  "SELECT state_json FROM matches WHERE status = 'in_progress' ORDER BY updated_at DESC LIMIT 1";
export const DELETE_SQL = 'DELETE FROM matches WHERE id = ?';

export function createMatchRepo(db: Database, now: () => number = Date.now): MatchRepo {
  let lastStamp = 0;
  // Strictly increasing so rapid saves in the same millisecond still order correctly.
  const stamp = (): number => {
    lastStamp = Math.max(now(), lastStamp + 1);
    return lastStamp;
  };

  return {
    async saveMatch(state: MatchState, status: MatchStatus): Promise<void> {
      const t = stamp();
      const { config } = state;
      await db.run(UPSERT_SQL, [
        config.id,
        config.teamA.name,
        config.teamB.name,
        config.rules.oversPerInnings,
        status,
        JSON.stringify(state),
        t,
        t,
      ]);
    },
    async loadMatch(id: string): Promise<MatchState | null> {
      const row = await db.getFirst<StateRow>(SELECT_STATE_SQL, [id]);
      return row ? (JSON.parse(row.state_json) as MatchState) : null;
    },
    async listMatches(): Promise<MatchSummary[]> {
      const rows = await db.getAll<SummaryRow>(LIST_SQL);
      return rows.map((r) => ({
        id: r.id,
        teamAName: r.team_a_name,
        teamBName: r.team_b_name,
        overs: r.overs,
        status: r.status === 'complete' ? 'complete' : 'in_progress',
        updatedAt: r.updated_at,
      }));
    },
    async getResumable(): Promise<MatchState | null> {
      const row = await db.getFirst<StateRow>(RESUMABLE_SQL);
      return row ? (JSON.parse(row.state_json) as MatchState) : null;
    },
    async deleteMatch(id: string): Promise<void> {
      await db.run(DELETE_SQL, [id]);
    },
  };
}
