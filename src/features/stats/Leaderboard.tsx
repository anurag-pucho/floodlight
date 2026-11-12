import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { fill } from '../home/copy';
import { statsCopy } from './copy';
import type { PlayerCareer } from './aggregate';

export type LeaderboardKind = 'runs' | 'wickets';

export const LEADERBOARD_SIZE = 5;

/** Top players by the metric (ties broken by the cheaper secondary figure), zero-scorers excluded. */
export function topPlayers(players: readonly PlayerCareer[], kind: LeaderboardKind, n = LEADERBOARD_SIZE): PlayerCareer[] {
  const list = players.filter((p) => (kind === 'runs' ? p.runs : p.wickets) > 0);
  list.sort((a, b) =>
    kind === 'runs'
      ? b.runs - a.runs || a.balls - b.balls || a.name.localeCompare(b.name)
      : b.wickets - a.wickets || a.runsConceded - b.runsConceded || a.name.localeCompare(b.name),
  );
  return list.slice(0, n);
}

const tabular = { fontVariant: ['tabular-nums' as const] };

export function Leaderboard({
  kind,
  players,
  onSelect,
}: {
  kind: LeaderboardKind;
  players: readonly PlayerCareer[];
  onSelect: (playerId: string) => void;
}) {
  const { spacing, colors } = useTheme();
  const { lang } = useT();
  const rows = topPlayers(players, kind);
  return (
    <View style={{ gap: spacing.sm }} testID={`leaderboard-${kind}`}>
      <Text variant="heading">{statsCopy(kind === 'runs' ? 'mostRuns' : 'mostWickets', lang)}</Text>
      <Surface elevation="low" padded={false}>
        {rows.length === 0 ? (
          <Text variant="caption" color="textSecondary" style={{ padding: spacing.lg }}>
            {statsCopy('noneYet', lang)}
          </Text>
        ) : (
          rows.map((p, i) => {
            const main = kind === 'runs' ? p.runs : p.wickets;
            const sub =
              kind === 'runs'
                ? `${statsCopy('highScore', lang)} ${p.highScore}`
                : `${statsCopy('economy', lang)} ${p.economy.toFixed(2)}`;
            return (
              <Pressable
                key={p.playerId}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${fill(statsCopy(kind === 'runs' ? 'runsShort' : 'wicketsShort', lang), { n: String(main) })}`}
                testID={`${kind}-row-${p.playerId}`}
                onPress={() => onSelect(p.playerId)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  minHeight: 56,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.hairline,
                }}
              >
                <Text variant="numeric" color={i === 0 ? 'gold' : 'textMuted'} style={[tabular, { width: spacing['2xl'] }]}>
                  {i + 1}
                </Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="body" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="caption" color="textSecondary" style={tabular}>
                    {sub}
                  </Text>
                </View>
                <Text variant="numeric" style={tabular}>
                  {main}
                </Text>
              </Pressable>
            );
          })
        )}
      </Surface>
    </View>
  );
}
