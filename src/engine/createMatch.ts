import { MatchConfig, MatchState } from './types';

export function createMatch(config: MatchConfig): MatchState {
  return { config, events: [], redo: [] };
}
