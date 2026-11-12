import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/useTheme';
import { useT } from '../src/i18n/useT';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { matchResult } from '../src/engine';
import type { MatchRepo } from '../src/db/types';
import { EmptyState } from '../src/features/home/EmptyState';
import { MatchListItem, type MatchListEntry } from '../src/features/home/MatchListItem';
import { fill, homeCopy } from '../src/features/home/copy';
import { translate, type Lang } from '../src/i18n/strings';

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
      if (res.tie || !res.winner) return { summary, result: translate(lang, 'tied') };
      const team = res.winner === 'A' ? summary.teamAName : summary.teamBName;
      return { summary, result: fill(homeCopy('wonResult', lang), { team, margin: res.margin ?? '' }) };
    }),
  );
}

export function MatchesScreen({ load }: { load?: MatchesLoader }) {
  const router = useRouter();
  const { spacing } = useTheme();
  const { lang } = useT();
  const [entries, setEntries] = useState<MatchListEntry[] | null>(null);

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
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingVertical: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display">{homeCopy('matches', lang)}</Text>
          <Text variant="body" color="textSecondary">
            {homeCopy('matchesSub', lang)}
          </Text>
        </View>
        {entries === null ? (
          <Text variant="caption" color="textSecondary">
            {homeCopy('loading', lang)}
          </Text>
        ) : entries.length === 0 ? (
          <EmptyState onNewMatch={() => router.push('/match/setup')} />
        ) : (
          entries.map((entry) => (
            <MatchListItem
              key={entry.summary.id}
              entry={entry}
              onPress={(id) => router.push({ pathname: '/match/scorecard', params: { id } })}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

export default function Matches() {
  return <MatchesScreen />;
}
