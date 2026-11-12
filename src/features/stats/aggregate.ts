import { battingCard, bowlingCard, matchResult } from '../../engine';
import type { MatchState } from '../../engine';

/** Input to `aggregateCareers`: a match is its state (the config rides inside it). */
export type StatsMatch = MatchState;

export interface BestBowling {
  wickets: number;
  runs: number;
}

export interface PlayerCareer {
  playerId: string;
  /** Name from the most recent match in the input order. */
  name: string;
  matches: number;
  innings: number;
  notOuts: number;
  runs: number;
  balls: number;
  highScore: number;
  fifties: number;
  hundreds: number;
  /** Runs per 100 balls faced; 0 with no balls faced. */
  strikeRate: number;
  wickets: number;
  bestBowling: BestBowling | null;
  ballsBowled: number;
  /** Overs in cricket notation, e.g. "12.3". */
  oversBowled: string;
  runsConceded: number;
  /** Runs conceded per over; 0 with no balls bowled. */
  economy: number;
  catches: number;
}

export interface H2H {
  /** Alphabetically first team name of the pair. */
  teamA: string;
  teamB: string;
  played: number;
  teamAWins: number;
  teamBWins: number;
  ties: number;
}

export interface Careers {
  players: PlayerCareer[];
  headToHead: H2H[];
}

type Acc = Omit<PlayerCareer, 'strikeRate' | 'oversBowled' | 'economy'>;

const BALLS_PER_OVER = 6;

/** "2.3" (overs.balls) to a legal-ball count. */
function oversToBalls(overs: string): number {
  const [o = '0', b = '0'] = overs.split('.');
  return Number(o) * BALLS_PER_OVER + Number(b);
}

export function formatOvers(balls: number): string {
  return `${Math.floor(balls / BALLS_PER_OVER)}.${balls % BALLS_PER_OVER}`;
}

function isBetter(a: BestBowling, b: BestBowling | null): boolean {
  return b === null || a.wickets > b.wickets || (a.wickets === b.wickets && a.runs < b.runs);
}

/**
 * Pure fold of every match's scorecards into per-player careers (merged by playerId, so
 * rematches stack) and per-team-pair head-to-head records. Only decided matches count
 * towards head-to-head. Pass matches oldest first so the latest name wins.
 */
export function aggregateCareers(matches: readonly StatsMatch[]): Careers {
  const byId = new Map<string, Acc>();
  const pairs = new Map<string, H2H>();

  const get = (id: string, name: string): Acc => {
    let a = byId.get(id);
    if (!a) {
      a = {
        playerId: id, name, matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, highScore: 0,
        fifties: 0, hundreds: 0, wickets: 0, bestBowling: null, ballsBowled: 0, runsConceded: 0, catches: 0,
      };
      byId.set(id, a);
    }
    a.name = name;
    return a;
  };

  for (const m of matches) {
    const state = m;
    const { config } = state;
    const nameOf = (id: string): string => config.players[id]?.name ?? id;
    const appeared = new Set<string>([...config.teamA.players, ...config.teamB.players].map((p) => p.playerId));

    for (const idx of [0, 1] as const) {
      for (const row of battingCard(state, idx)) {
        appeared.add(row.playerId);
        const a = get(row.playerId, nameOf(row.playerId));
        a.innings += 1;
        a.runs += row.runs;
        a.balls += row.balls;
        if (!row.out) a.notOuts += 1;
        a.highScore = Math.max(a.highScore, row.runs);
        if (row.runs >= 100) a.hundreds += 1;
        else if (row.runs >= 50) a.fifties += 1;
      }
      for (const row of bowlingCard(state, idx)) {
        appeared.add(row.playerId);
        const a = get(row.playerId, nameOf(row.playerId));
        a.wickets += row.wickets;
        a.ballsBowled += oversToBalls(row.overs);
        a.runsConceded += row.runs;
        const figures = { wickets: row.wickets, runs: row.runs };
        if (isBetter(figures, a.bestBowling)) a.bestBowling = figures;
      }
    }
    for (const e of state.events) {
      if (e.wicket?.type === 'caught' && e.wicket.fielderId) get(e.wicket.fielderId, nameOf(e.wicket.fielderId)).catches += 1;
    }
    appeared.forEach((id) => {
      get(id, nameOf(id)).matches += 1;
    });

    const res = matchResult(state);
    const nameA = config.teamA.name.trim();
    const nameB = config.teamB.name.trim();
    if (!res.decided || nameA === nameB) continue;
    const [first, second] = nameA < nameB ? [nameA, nameB] : [nameB, nameA];
    const key = `${first}\u0000${second}`;
    const rec = pairs.get(key) ?? { teamA: first, teamB: second, played: 0, teamAWins: 0, teamBWins: 0, ties: 0 };
    rec.played += 1;
    if (res.tie || !res.winner) rec.ties += 1;
    else {
      const winner = res.winner === 'A' ? nameA : nameB;
      if (winner === first) rec.teamAWins += 1;
      else rec.teamBWins += 1;
    }
    pairs.set(key, rec);
  }

  const players = [...byId.values()].map(
    (a): PlayerCareer => ({
      ...a,
      strikeRate: a.balls === 0 ? 0 : (a.runs / a.balls) * 100,
      oversBowled: formatOvers(a.ballsBowled),
      economy: a.ballsBowled === 0 ? 0 : a.runsConceded / (a.ballsBowled / BALLS_PER_OVER),
    }),
  );
  return { players, headToHead: [...pairs.values()] };
}
