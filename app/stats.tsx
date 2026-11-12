import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/useTheme';
import { useT } from '../src/i18n/useT';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Text } from '../src/components/Text';
import { aggregateCareers, type Careers } from '../src/features/stats/aggregate';
import { loadCompletedMatches, type StatsLoader } from '../src/features/stats/load';
import { statsCopy } from '../src/features/stats/copy';
import { Leaderboard } from '../src/features/stats/Leaderboard';
import { PlayerList } from '../src/features/stats/PlayerList';
import { PlayerDetail } from '../src/features/stats/PlayerDetail';
import { HeadToHead } from '../src/features/stats/HeadToHead';
import { StatsEmpty } from '../src/features/stats/StatsEmpty';

export function StatsScreen({ load }: { load?: StatsLoader }) {
  const router = useRouter();
  const { spacing } = useTheme();
  const { lang } = useT();
  const [careers, setCareers] = useState<Careers | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (load ?? (() => loadCompletedMatches()))()
      .then((matches) => {
        if (alive) setCareers(aggregateCareers(matches));
      })
      .catch(() => {
        if (alive) setCareers({ players: [], headToHead: [] });
      });
    return () => {
      alive = false;
    };
  }, [load]);

  const player = useMemo(
    () => careers?.players.find((p) => p.playerId === selected) ?? null,
    [careers, selected],
  );

  return (
    <Screen header={<ScreenHeader showHome={false} />} style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="display">{statsCopy('title', lang)}</Text>
        <Text variant="body" color="textSecondary">
          {statsCopy('subtitle', lang)}
        </Text>
      </View>
      {careers === null ? (
        <Text variant="caption" color="textSecondary">
          {statsCopy('loading', lang)}
        </Text>
      ) : careers.players.length === 0 ? (
        <StatsEmpty onNewMatch={() => router.push('/match/setup')} />
      ) : (
        <>
          {player ? <PlayerDetail player={player} onClose={() => setSelected(null)} /> : null}
          <Leaderboard kind="runs" players={careers.players} onSelect={setSelected} />
          <Leaderboard kind="wickets" players={careers.players} onSelect={setSelected} />
          <PlayerList players={careers.players} onSelect={setSelected} />
          <HeadToHead records={careers.headToHead} />
        </>
      )}
    </Screen>
  );
}

export default function Stats() {
  return <StatsScreen />;
}
