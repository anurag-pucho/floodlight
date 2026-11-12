import { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/useTheme';
import { useT } from '../src/i18n/useT';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Text } from '../src/components/Text';
import { TapButton } from '../src/components/TapButton';
import { matchResult } from '../src/engine';
import { matchStore } from '../src/store/matchStore';
import { rematchConfig } from '../src/features/home/rematch';
import type { MatchRepo } from '../src/db/types';
import { EmptyState } from '../src/features/home/EmptyState';
import { MatchListItem, type MatchListEntry } from '../src/features/home/MatchListItem';
import { fill, homeCopy, type HomeCopyKey } from '../src/features/home/copy';
import { FilterChip } from '../src/features/home/FilterChip';
import {
  DEFAULT_FILTERS,
  filterMatches,
  type MatchFilters,
  type SortOrder,
  type StatusFilter,
} from '../src/features/home/filterMatches';
import { translate, type Lang } from '../src/i18n/strings';

const STATUS_CHIPS: { key: StatusFilter; label: HomeCopyKey }[] = [
  { key: 'all', label: 'filterAll' },
  { key: 'in_progress', label: 'inProgress' },
  { key: 'complete', label: 'complete' },
];
const SORT_CHIPS: { key: SortOrder; label: HomeCopyKey }[] = [
  { key: 'newest', label: 'sortNewest' },
  { key: 'oldest', label: 'sortOldest' },
];

export type MatchesLoader = () => Promise<MatchListEntry[]>;

/** Lazily opens the native DB (required inside so tests never load expo-sqlite). */
let repoPromise: Promise<MatchRepo> | null = null;
function openRepo(): Promise<MatchRepo> {
  repoPromise ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('../src/db') as typeof import('../src/db');
    const database = await db.openExpoDatabase();
    await db.initDb(database);
    return db.createMatchRepo(database);
  })();
  return repoPromise;
}

/** Saved matches, newest first, each completed one carrying its result line. */
export async function loadSavedMatches(repo?: MatchRepo, lang: Lang = 'en'): Promise<MatchListEntry[]> {
  const r = repo ?? (await openRepo());
  const summaries = [...(await r.listMatches())].sort((a, b) => b.updatedAt - a.updatedAt);
  return Promise.all(
    summaries.map(async (summary): Promise<MatchListEntry> => {
      if (summary.status !== 'complete') return { summary, result: null };
      const state = await r.loadMatch(summary.id);
      if (!state) return { summary, result: null };
      const res = matchResult(state);
      if (!res.decided) return { summary, result: null };
      if (res.tie || !res.winner) return { summary, result: translate(lang, 'tied'), config: state.config };
      const team = res.winner === 'A' ? summary.teamAName : summary.teamBName;
      return { summary, result: fill(homeCopy('wonResult', lang), { team, margin: res.margin ?? '' }), config: state.config };
    }),
  );
}

export function MatchesScreen({ load }: { load?: MatchesLoader }) {
  const router = useRouter();
  const { spacing, colors, radii, elevation, typography } = useTheme();
  const { lang } = useT();
  const [entries, setEntries] = useState<MatchListEntry[] | null>(null);
  const [filters, setFilters] = useState<MatchFilters>(DEFAULT_FILTERS);
  const visible = useMemo(() => filterMatches(entries ?? [], filters), [entries, filters]);

  useEffect(() => {
    let alive = true;
    (load ?? (() => loadSavedMatches(undefined, lang)))()
      .then((e) => {
        if (alive) setEntries(e);
      })
      .catch(() => {
        if (alive) setEntries([]);
      });
    return () => {
      alive = false;
    };
  }, [load, lang]);

  return (
    <Screen header={<ScreenHeader showHome={false} />} style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="display">{homeCopy('matches', lang)}</Text>
        <Text variant="body" color="textSecondary">
          {homeCopy('matchesSub', lang)}
        </Text>
      </View>
      {entries !== null && entries.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <TextInput
            testID="matches-search"
            accessibilityLabel={homeCopy('searchPlaceholder', lang)}
            placeholder={homeCopy('searchPlaceholder', lang)}
            placeholderTextColor={colors.textMuted}
            value={filters.query}
            onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={{
              color: colors.textPrimary,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radii.md,
              borderWidth: elevation.hairlineWidth,
              borderColor: colors.hairline,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
            }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {STATUS_CHIPS.map(({ key, label }) => (
              <FilterChip
                key={key}
                testID={`filter-status-${key}`}
                label={homeCopy(label, lang)}
                selected={filters.status === key}
                onPress={() => setFilters((f) => ({ ...f, status: key }))}
              />
            ))}
            {SORT_CHIPS.map(({ key, label }) => (
              <FilterChip
                key={key}
                testID={`filter-sort-${key}`}
                label={homeCopy(label, lang)}
                selected={filters.sort === key}
                onPress={() => setFilters((f) => ({ ...f, sort: key }))}
              />
            ))}
          </View>
        </View>
      ) : null}
      {entries === null ? (
        <Text variant="caption" color="textSecondary">
          {homeCopy('loading', lang)}
        </Text>
      ) : entries.length === 0 ? (
        <EmptyState onNewMatch={() => router.push('/match/setup')} />
      ) : visible.length === 0 ? (
        <View testID="matches-no-results" style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing['2xl'] }}>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            {homeCopy('noResultsTitle', lang)}
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {homeCopy('noResultsBody', lang)}
          </Text>
          <TapButton
            variant="secondary"
            label={homeCopy('clearFilters', lang)}
            testID="matches-clear-filters"
            onPress={() => setFilters(DEFAULT_FILTERS)}
          />
        </View>
      ) : (
        visible.map((entry) => (
          <MatchListItem
            key={entry.summary.id}
            entry={entry}
            onPress={(id) => router.push({ pathname: '/match/scorecard', params: { id } })}
            onRematch={(config) => {
              matchStore.getState().newMatch(rematchConfig(config));
              router.push('/match/score');
            }}
          />
          ))
        )}
    </Screen>
  );
}

export default function Matches() {
  return <MatchesScreen />;
}
