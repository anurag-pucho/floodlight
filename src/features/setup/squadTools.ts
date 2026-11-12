import type { MatchConfig } from '../../engine';
import { nameKey, type Side, type TeamInput } from './buildConfig';
import type { SavedMatchSource } from './savedMatches';

export interface TeamsPair {
  teamA: TeamInput;
  teamB: TeamInput;
}

/**
 * Moves the own player at `index` of team `from` to the end of the other team's squad.
 * Roles are per-team: a captain / wicketkeeper mark on the moved player is dropped from the
 * source team, and the player arrives in the other team with no marks. Out-of-range or blank
 * entries leave the teams unchanged.
 */
export function movePlayer(teams: TeamsPair, from: Side, index: number): TeamsPair {
  const source = from === 'A' ? teams.teamA : teams.teamB;
  const target = from === 'A' ? teams.teamB : teams.teamA;
  const name = source.players[index];
  if (name === undefined || name.trim().length === 0) return teams;

  const { captain, wicketkeeper, ...rest } = source;
  const next: TeamInput = {
    ...rest,
    players: source.players.filter((_, j) => j !== index),
    ...(captain !== undefined && nameKey(captain) !== nameKey(name) ? { captain } : {}),
    ...(wicketkeeper !== undefined && nameKey(wicketkeeper) !== nameKey(name)
      ? { wicketkeeper }
      : {}),
  };
  const moved: TeamInput = {
    ...target,
    players: [...target.players, name.trim()],
  };
  return from === 'A' ? { teamA: next, teamB: moved } : { teamA: moved, teamB: next };
}

/** Distinct player names across saved matches: case-insensitive dedupe (first spelling wins), sorted. */
export function knownPlayerNames(matches: ReadonlyArray<{ config: MatchConfig }>): string[] {
  const seen = new Map<string, string>();
  for (const m of matches) {
    for (const p of Object.values(m.config.players)) {
      const name = p.name.trim();
      const k = nameKey(name);
      if (k.length > 0 && !seen.has(k)) seen.set(k, name);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Loads every saved match through the (injectable) source and aggregates the player names. */
export async function loadKnownPlayerNames(source: SavedMatchSource): Promise<string[]> {
  const list = await source.listMatches();
  const states = await Promise.all(list.map((m) => source.loadMatch(m.id)));
  return knownPlayerNames(states.filter((s): s is NonNullable<typeof s> => s !== null));
}

/** Suggestions for a name field: contains-match on what is typed, minus names already in the squad. */
export function filterSuggestions(
  known: readonly string[],
  query: string,
  exclude: readonly string[],
  limit = 6,
): string[] {
  const q = nameKey(query);
  const taken = new Set(exclude.map(nameKey));
  return known
    .filter((n) => !taken.has(nameKey(n)) && (q.length === 0 || nameKey(n).includes(q)))
    .slice(0, limit);
}
