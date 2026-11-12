import { BallRecord, MatchState } from './types';

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
    if (e.runsBat % 2 === 1) [striker, non] = [non, striker];
    if (e.legal) {
      legal += 1;
      if (legal % BALLS_PER_OVER === 0) [striker, non] = [non, striker];
    }
  }
  return striker;
}
