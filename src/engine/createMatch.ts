import { MatchConfig, MatchState } from './types';
import { currentInningsIndex, isInningsComplete } from './select';

export function createMatch(config: MatchConfig): MatchState {
  return { config, events: [], redo: [] };
}

/** Begin the chase. Requires innings 0 to be complete; later deliveries are stamped innings 1. */
export function startNextInnings(state: MatchState): MatchState {
  if (currentInningsIndex(state) === 1) throw new Error('Second innings already started');
  if (!isInningsComplete(state)) throw new Error('First innings is not complete');
  return { ...state, inningsPointer: 1, redo: [] };
}
