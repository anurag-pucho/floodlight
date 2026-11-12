import { createMatchRepo } from '../../src/db/matchRepo';
import {
  initDb, CREATE_MATCHES_SQL,
} from '../../src/db/schema';
import {
  UPSERT_SQL, SELECT_STATE_SQL, LIST_SQL, RESUMABLE_SQL, DELETE_SQL,
} from '../../src/db/matchRepo';
import type { Database, SqlParam } from '../../src/db/types';
import { createMatch, applyDelivery, teamTotal, MatchConfig, MatchState } from '../../src/engine';

interface Row {
  id: string; team_a_name: string; team_b_name: string; overs: number;
  status: string; state_json: string; created_at: number; updated_at: number;
}

/** In-memory fake that understands exactly the statements the repo issues. */
function createFakeDb(): Database & { rows: Map<string, Row>; execd: string[] } {
  const rows = new Map<string, Row>();
  const execd: string[] = [];
  const sorted = (): Row[] => [...rows.values()].sort((a, b) => b.updated_at - a.updated_at);
  return {
    rows,
    execd,
    async exec(sql) { execd.push(sql); },
    async run(sql: string, p: SqlParam[] = []) {
      if (sql === UPSERT_SQL) {
        const [id, a, b, overs, status, json, created, updated] = p as [string, string, string, number, string, string, number, number];
        const prev = rows.get(id);
        rows.set(id, {
          id, team_a_name: a, team_b_name: b, overs, status, state_json: json,
          created_at: prev ? prev.created_at : created, updated_at: updated,
        });
      } else if (sql === DELETE_SQL) {
        rows.delete(p[0] as string);
      } else throw new Error(`unexpected run: ${sql}`);
    },
    async getAll<T>(sql: string): Promise<T[]> {
      if (sql === LIST_SQL) return sorted() as unknown as T[];
      throw new Error(`unexpected getAll: ${sql}`);
    },
    async getFirst<T>(sql: string, p: SqlParam[] = []): Promise<T | null> {
      if (sql === SELECT_STATE_SQL) return (rows.get(p[0] as string) as unknown as T) ?? null;
      if (sql === RESUMABLE_SQL) {
        return (sorted().find((r) => r.status === 'in_progress') as unknown as T) ?? null;
      }
      throw new Error(`unexpected getFirst: ${sql}`);
    },
  };
}

function makeConfig(id: string, a = 'Team A', b = 'Team B', overs = 2): MatchConfig {
  return {
    id,
    teamA: { id: 'A', name: a, color: '#f00', players: [{ playerId: 'a1', isShared: false }, { playerId: 'a2', isShared: false }] },
    teamB: { id: 'B', name: b, color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' },
    },
    rules: { oversPerInnings: overs, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}

function played(id: string): MatchState {
  let s = createMatch(makeConfig(id));
  const base = { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' };
  s = applyDelivery(s, { ...base, runsBat: 4 });
  s = applyDelivery(s, { ...base, runsBat: 0, extra: { type: 'wide', runs: 1 } });
  s = applyDelivery(s, { ...base, runsBat: 1 });
  return s;
}

describe('matchRepo', () => {
  let db: ReturnType<typeof createFakeDb>;
  let clock: number;
  let repo: ReturnType<typeof createMatchRepo>;
  beforeEach(() => {
    db = createFakeDb();
    clock = 1000;
    repo = createMatchRepo(db, () => clock);
  });

  it('initDb issues idempotent CREATE ... IF NOT EXISTS statements', async () => {
    await initDb(db);
    await initDb(db);
    expect(db.execd).toContain(CREATE_MATCHES_SQL);
    expect(db.execd.every((s) => /IF NOT EXISTS/.test(s))).toBe(true);
  });

  it('round-trips a MatchState exactly', async () => {
    const s = played('m1');
    await repo.saveMatch(s, 'in_progress');
    const loaded = await repo.loadMatch('m1');
    expect(loaded).toEqual(s);
    expect(loaded?.seq).toBe(s.seq);
    expect(loaded?.events).toEqual(s.events);
  });

  it('round-trips redo stack', async () => {
    const s = played('m1');
    const withRedo: MatchState = { ...s, events: s.events.slice(0, 2), redo: s.events.slice(2) };
    await repo.saveMatch(withRedo, 'in_progress');
    expect(await repo.loadMatch('m1')).toEqual(withRedo);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.loadMatch('nope')).toBeNull();
  });

  it('re-saving the same id updates rather than duplicates', async () => {
    const s = played('m1');
    await repo.saveMatch(s, 'in_progress');
    clock = 2000;
    const s2 = applyDelivery(s, { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runsBat: 6 });
    await repo.saveMatch(s2, 'complete');
    expect(db.rows.size).toBe(1);
    const list = await repo.listMatches();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('complete');
    expect(await repo.loadMatch('m1')).toEqual(s2);
    expect(db.rows.get('m1')?.created_at).toBe(1000);
  });

  it('listMatches returns summaries newest first', async () => {
    await repo.saveMatch(createMatch(makeConfig('old', 'Lions', 'Tigers', 5)), 'complete');
    clock = 5000;
    await repo.saveMatch(createMatch(makeConfig('new', 'Kings', 'Queens', 10)), 'in_progress');
    const list = await repo.listMatches();
    expect(list.map((m) => m.id)).toEqual(['new', 'old']);
    expect(list[0]).toEqual({
      id: 'new', teamAName: 'Kings', teamBName: 'Queens', overs: 10, status: 'in_progress', updatedAt: 5000,
    });
  });

  it('orders correctly even when saves share a millisecond', async () => {
    await repo.saveMatch(createMatch(makeConfig('first')), 'in_progress');
    await repo.saveMatch(createMatch(makeConfig('second')), 'in_progress');
    expect((await repo.listMatches()).map((m) => m.id)).toEqual(['second', 'first']);
  });

  it('getResumable returns latest in_progress match, null when none', async () => {
    expect(await repo.getResumable()).toBeNull();
    await repo.saveMatch(createMatch(makeConfig('done')), 'complete');
    expect(await repo.getResumable()).toBeNull();
    clock = 2000;
    await repo.saveMatch(played('a'), 'in_progress');
    clock = 3000;
    const b = played('b');
    await repo.saveMatch(b, 'in_progress');
    clock = 4000;
    await repo.saveMatch(createMatch(makeConfig('done2')), 'complete');
    expect(await repo.getResumable()).toEqual(b);
  });

  it('deleteMatch removes the match', async () => {
    await repo.saveMatch(played('m1'), 'in_progress');
    await repo.deleteMatch('m1');
    expect(await repo.loadMatch('m1')).toBeNull();
    expect(await repo.listMatches()).toEqual([]);
  });

  it('a loaded state reproduces the same teamTotal via engine selectors', async () => {
    const s = played('m1');
    await repo.saveMatch(s, 'in_progress');
    const loaded = (await repo.loadMatch('m1')) as MatchState;
    expect(teamTotal(s, 0)).toBe(7);
    expect(teamTotal(loaded, 0)).toBe(teamTotal(s, 0));
  });
});
