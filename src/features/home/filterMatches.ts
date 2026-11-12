import type { MatchListEntry } from './MatchListItem';

export type StatusFilter = 'all' | 'in_progress' | 'complete';
export type SortOrder = 'newest' | 'oldest';

export interface MatchFilters {
  query: string;
  status: StatusFilter;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: MatchFilters = { query: '', status: 'all', sort: 'newest' };

function matchesQuery(entry: MatchListEntry, needle: string): boolean {
  const { summary, config } = entry;
  if (summary.teamAName.toLowerCase().includes(needle)) return true;
  if (summary.teamBName.toLowerCase().includes(needle)) return true;
  if (!config) return false;
  if (config.teamA.name.toLowerCase().includes(needle)) return true;
  if (config.teamB.name.toLowerCase().includes(needle)) return true;
  return Object.values(config.players).some((p) => p.name.toLowerCase().includes(needle));
}

/**
 * Pure filter + sort over saved matches. Query is a case-insensitive substring match
 * against team names and (when the config is known) player names. Does not mutate input.
 */
export function filterMatches(list: readonly MatchListEntry[], filters: MatchFilters): MatchListEntry[] {
  const needle = filters.query.trim().toLowerCase();
  const out = list.filter(
    (e) =>
      (filters.status === 'all' || e.summary.status === filters.status) && (needle === '' || matchesQuery(e, needle)),
  );
  // Stable sort by updatedAt; "newest" is the default ordering of the loader.
  const dir = filters.sort === 'newest' ? -1 : 1;
  return out
    .map((e, i) => ({ e, i }))
    .sort((a, b) => dir * (a.e.summary.updatedAt - b.e.summary.updatedAt) || a.i - b.i)
    .map((x) => x.e);
}
