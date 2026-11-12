import { randomUUID } from 'expo-crypto';
import type { MatchConfig } from '../../engine';

/** Clone a finished match's config for a rematch: fresh id, same sides/rules, batting order swapped. */
export function rematchConfig(prev: MatchConfig): MatchConfig {
  return {
    ...prev,
    id: randomUUID(),
    battingFirst: prev.battingFirst === 'A' ? 'B' : 'A',
  };
}
