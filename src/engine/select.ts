import { BallRecord, MatchState } from './types';
import { ballBowlerRuns, ballTotalRuns, runsRun } from './rules';

const BALLS_PER_OVER = 6;

export function currentInningsIndex(_state: MatchState): 0 | 1 {
  return 0;
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

/** Id on strike for the next delivery, derived by folding the event log. */
export function onStrikeId(state: MatchState): string {
  const events = inningsEvents(state, currentInningsIndex(state));
  if (events.length === 0) return '';
  let striker = events[0].strikerId;
  let non = events[0].nonStrikerId;
  let legal = 0;
  for (const e of events) {
    if (runsRun(e) % 2 === 1) [striker, non] = [non, striker];
    if (e.legal) {
      legal += 1;
      if (legal % BALLS_PER_OVER === 0) [striker, non] = [non, striker];
    }
  }
  return striker;
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
export function batterRuns(state: MatchState, batterId: string): number {
  return state.events
    .filter(e => e.strikerId === batterId)
    .reduce((sum, e) => sum + e.runsBat, 0);
}

/** Runs conceded by a bowler (excludes byes and leg-byes). */
export function bowlerConceded(state: MatchState, bowlerId: string): number {
  return state.events
    .filter(e => e.bowlerId === bowlerId)
    .reduce((sum, e) => sum + ballBowlerRuns(e, state.config.rules), 0);
}
