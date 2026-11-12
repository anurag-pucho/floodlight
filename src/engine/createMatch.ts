import { MatchConfig, MatchState } from './types';
import { inningsComplete } from './select';

export function createMatch(config: MatchConfig): MatchState {
  return { config, events: [], redo: [], seq: 0 };
}

/**
 * Validating no-op: the innings pointer is derived from the event log, so the chase
 * begins automatically once innings 0 is complete. Throws if it is not yet complete.
 */
export function startNextInnings(state: MatchState): MatchState {
  if (!inningsComplete(state, 0)) throw new Error('First innings is not complete');
  return state;
}
