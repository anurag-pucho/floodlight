import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import { statsCopy, type StatsCopyKey } from './copy';
import type { PlayerCareer } from './aggregate';

const tabular = { fontVariant: ['tabular-nums' as const] };

function Stat({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ minWidth: '30%', flexGrow: 1, gap: spacing.xs }}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="numeric" style={tabular}>
        {value}
      </Text>
    </View>
  );
}

export function PlayerDetail({ player, onClose }: { player: PlayerCareer; onClose: () => void }) {
  const { spacing } = useTheme();
  const { lang } = useT();
  const c = (k: StatsCopyKey) => statsCopy(k, lang);
  const best = player.bestBowling ? `${player.bestBowling.wickets}/${player.bestBowling.runs}` : '-';
  const batting: [StatsCopyKey, string][] = [
    ['matches', String(player.matches)],
    ['innings', String(player.innings)],
    ['runs', String(player.runs)],
    ['balls', String(player.balls)],
    ['highScore', String(player.highScore)],
    ['strikeRate', player.strikeRate.toFixed(1)],
    ['fifties', String(player.fifties)],
    ['hundreds', String(player.hundreds)],
    ['notOuts', String(player.notOuts)],
  ];
  const bowling: [StatsCopyKey, string][] = [
    ['wickets', String(player.wickets)],
    ['best', best],
    ['overs', player.oversBowled],
    ['conceded', String(player.runsConceded)],
    ['economy', player.economy.toFixed(2)],
    ['catches', String(player.catches)],
  ];
  const grid = (items: [StatsCopyKey, string][]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
      {items.map(([k, v]) => (
        <Stat key={k} label={c(k)} value={v} />
      ))}
    </View>
  );
  return (
    <Surface elevation="medium" testID="player-detail">
      <View style={{ gap: spacing.lg }}>
        <Text variant="display" numberOfLines={2} testID="player-detail-name">
          {player.name}
        </Text>
        <Text variant="label" color="primary">
          {c('batting')}
        </Text>
        {grid(batting)}
        <Text variant="label" color="primary">
          {c('bowling')}
        </Text>
        {grid(bowling)}
        <TapButton variant="secondary" label={c('close')} onPress={onClose} testID="player-detail-close" />
      </View>
    </Surface>
  );
}
