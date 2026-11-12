import { BallRecord, MatchState } from './types';
import { BALLS_PER_OVER, ballBowlerRuns, ballTotalRuns, runsRun } from './rules';

export function currentInningsIndex(state: MatchState): 0 | 1 {
  // Derived from the event log: innings 1 begins once innings 0 is complete.
  return inningsComplete(state, 0) ? 1 : 0;
}

export function inningsEvents(state: MatchState, inningsIndex: 0 | 1): BallRecord[] {
  return state.events.filter(e => e.inningsIndex === inningsIndex);
}

export function legalBallCount(state: MatchState, inningsIndex: 0 | 1): number {
  return inningsEvents(state, inningsIndex).filter(e => e.legal).length;
}

export function legalBallsInCurrentOver(state: MatchState): number {
  return legalBallCount(state, currentInningsIndex(state)) % BALLS_PER_OVER;
}

/**
 * Batters at the crease after the last delivery, derived by folding the event log.
 * Each delivery declares its own pair (so a replacement is picked up on the next
 * delivery); a dismissed batter's slot is '' until that replacement is supplied.
 */
export function batsmenAtCrease(state: MatchState): { strikerId: string; nonStrikerId: string } {
  const events = inningsEvents(state, currentInningsIndex(state));
  let striker = '';
  let non = '';
  let legal = 0;
  for (const e of events) {
    striker = e.strikerId;
    non = e.nonStrikerId;
    if (runsRun(e) % 2 === 1) [striker, non] = [non, striker];
    if (e.legal) {
      legal += 1;
      if (legal % BALLS_PER_OVER === 0) [striker, non] = [non, striker];
    }
    if (e.wicket) {
      if (striker === e.wicket.outPlayerId) striker = '';
      else if (non === e.wicket.outPlayerId) non = '';
    }
  }
  return { strikerId: striker, nonStrikerId: non };
}

/** Id on strike for the next delivery, derived by folding the event log. */
export function onStrikeId(state: MatchState): string {
  return batsmenAtCrease(state).strikerId;
}

export function dismissedIds(state: MatchState, inningsIndex: 0 | 1): Set<string> {
  const out = new Set<string>();
  for (const e of inningsEvents(state, inningsIndex)) if (e.wicket) out.add(e.wicket.outPlayerId);
  return out;
}

export function wicketsDown(state: MatchState, inningsIndex: 0 | 1): number {
  return inningsEvents(state, inningsIndex).filter(e => e.wicket).length;
}

/** Wickets credited to a bowler (run-outs excluded). */
export function bowlerWickets(state: MatchState, bowlerId: string, inningsIndex?: 0 | 1): number {
  return state.events.filter(
    e => e.bowlerId === bowlerId && (inningsIndex === undefined || e.inningsIndex === inningsIndex)
      && e.wicket && e.wicket.type !== 'runout',
  ).length;
}

/** Completed overs bowled by a bowler in an innings (legal balls only). */
export function bowlerOversBowled(state: MatchState, bowlerId: string, inningsIndex: 0 | 1): number {
  const legal = inningsEvents(state, inningsIndex).filter(e => e.bowlerId === bowlerId && e.legal).length;
  return Math.floor(legal / BALLS_PER_OVER);
}

export function battingSquadSize(state: MatchState, inningsIndex: 0 | 1): number {
  const first = state.config.battingFirst === 'A' ? state.config.teamA : state.config.teamB;
  const second = state.config.battingFirst === 'A' ? state.config.teamB : state.config.teamA;
  return (inningsIndex === 0 ? first : second).players.length;
}

/** True when the current innings has ended (overs exhausted or all out). */
export function isInningsComplete(state: MatchState): boolean {
  // Until a delivery of the chase is played, "the innings" is the one that just ended.
  if (inningsEvents(state, 1).length === 0) return inningsComplete(state, 0);
  return inningsComplete(state, 1);
}

export function inningsComplete(state: MatchState, idx: 0 | 1): boolean {
  if (idx === 1) {
    const t = target(state);
    if (t !== null && teamTotal(state, 1) >= t) return true;
  }
  const { oversPerInnings, lastManStands } = state.config.rules;
  if (legalBallCount(state, idx) >= oversPerInnings * BALLS_PER_OVER) return true;
  const squad = battingSquadSize(state, idx);
  const limit = lastManStands ? squad : squad - 1;
  return wicketsDown(state, idx) >= limit;
}

export interface FallOfWicket { wicketNo: number; score: number; over: string; outPlayerId: string; }

export function fallOfWickets(state: MatchState, inningsIndex: 0 | 1): FallOfWicket[] {
  const out: FallOfWicket[] = [];
  let score = 0;
  let legal = 0;
  for (const e of inningsEvents(state, inningsIndex)) {
    score += ballTotalRuns(e, state.config.rules);
    if (e.legal) legal += 1;
    if (e.wicket) {
      out.push({
        wicketNo: out.length + 1,
        score,
        over: `${Math.floor(legal / BALLS_PER_OVER)}.${legal % BALLS_PER_OVER}`,
        outPlayerId: e.wicket.outPlayerId,
      });
    }
  }
  return out;
}

/** True iff the next legal delivery is a free hit. */
export function isFreeHit(state: MatchState): boolean {
  if (!state.config.rules.freeHitOnNoBall) return false;
  const events = inningsEvents(state, currentInningsIndex(state));
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.legal) return false;
    if (e.extra?.type === 'noball') return true;
    // a wide does not consume the free hit; keep looking back
  }
  return false;
}

export interface TeamExtras { wides: number; noBalls: number; byes: number; legByes: number; total: number; }

export function teamExtras(state: MatchState, inningsIndex: 0 | 1): TeamExtras {
  const { wideRuns, noBallRuns } = state.config.rules;
  const out: TeamExtras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
  for (const e of inningsEvents(state, inningsIndex)) {
    if (!e.extra) continue;
    switch (e.extra.type) {
      case 'wide': out.wides += wideRuns + e.extra.runs; break;
      case 'noball': out.noBalls += noBallRuns; break;
      case 'bye': out.byes += e.extra.runs; break;
      case 'legbye': out.legByes += e.extra.runs; break;
    }
  }
  out.total = out.wides + out.noBalls + out.byes + out.legByes;
  return out;
}

export function teamTotal(state: MatchState, inningsIndex: 0 | 1): number {
  return inningsEvents(state, inningsIndex).reduce((sum, e) => sum + ballTotalRuns(e, state.config.rules), 0);
}

/** Runs credited to a batter (bat runs only, never byes/leg-byes/wides). */
export function batterRuns(state: MatchState, batterId: string, inningsIndex?: 0 | 1): number {
  return state.events
    .filter(e => e.strikerId === batterId && (inningsIndex === undefined || e.inningsIndex === inningsIndex))
    .reduce((sum, e) => sum + e.runsBat, 0);
}

/** Runs conceded by a bowler (excludes byes and leg-byes). */
export function bowlerConceded(state: MatchState, bowlerId: string, inningsIndex?: 0 | 1): number {
  return state.events
    .filter(e => e.bowlerId === bowlerId && (inningsIndex === undefined || e.inningsIndex === inningsIndex))
    .reduce((sum, e) => sum + ballBowlerRuns(e, state.config.rules), 0);
}

function battingSide(state: MatchState, inningsIndex: 0 | 1): 'A' | 'B' {
  const first = state.config.battingFirst;
  return inningsIndex === 0 ? first : first === 'A' ? 'B' : 'A';
}

/** Target for the chasing side: innings-0 total + 1, once innings 0 is complete. */
export function target(state: MatchState): number | null {
  return inningsComplete(state, 0) ? teamTotal(state, 0) + 1 : null;
}

export interface ChaseStatus { runsNeeded: number; ballsRemaining: number; requiredRunRate: number; }

export function chaseStatus(state: MatchState): ChaseStatus | null {
  const t = target(state);
  if (t === null || currentInningsIndex(state) !== 1) return null;
  const runsNeeded = Math.max(0, t - teamTotal(state, 1));
  const ballsRemaining = Math.max(0, state.config.rules.oversPerInnings * BALLS_PER_OVER - legalBallCount(state, 1));
  const requiredRunRate = ballsRemaining === 0 ? 0 : (runsNeeded * BALLS_PER_OVER) / ballsRemaining;
  return { runsNeeded, ballsRemaining, requiredRunRate };
}

export interface MatchResult { decided: boolean; winner?: 'A' | 'B'; tie?: boolean; margin?: string; }

export function matchResult(state: MatchState): MatchResult {
  const t = target(state);
  if (t === null || currentInningsIndex(state) !== 1) return { decided: false };
  const chasing = teamTotal(state, 1);
  if (chasing >= t) {
    const { lastManStands } = state.config.rules;
    const squad = battingSquadSize(state, 1);
    const left = (lastManStands ? squad : squad - 1) - wicketsDown(state, 1);
    return { decided: true, winner: battingSide(state, 1), margin: `by ${left} ${left === 1 ? 'wicket' : 'wickets'}` };
  }
  if (!inningsComplete(state, 1)) return { decided: false };
  if (chasing === t - 1) return { decided: true, tie: true };
  return { decided: true, winner: battingSide(state, 0), margin: `by ${t - 1 - chasing} ${t - 1 - chasing === 1 ? 'run' : 'runs'}` };
}

export function needsSuperOver(state: MatchState): boolean {
  return matchResult(state).tie === true;
}
