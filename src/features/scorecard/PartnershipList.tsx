import { View } from 'react-native';
import { partnerships } from '../../engine';
import type { MatchState } from '../../engine';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useScorecardT } from './useScorecardT';

export function PartnershipList({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { spacing, fontFamily } = useTheme();
  const s = useScorecardT();
  const rows = partnerships(state, inningsIndex);
  if (rows.length === 0) return null;
  const name = (id: string) => state.config.players[id]?.name ?? id;
  return (
    <View testID="partnership-list" style={{ gap: spacing.xs }}>
      <Text variant="label" color="primary">{s('partnerships').toUpperCase()}</Text>
      {rows.map((p) => (
        <View key={p.forWicket} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            {s('partnershipEntry', { a: name(p.playerIds[0]), b: name(p.playerIds[1]) })}
          </Text>
          <Text variant="caption" style={{ fontFamily: fontFamily.numeric }}>{`${p.runs} (${p.balls})`}</Text>
        </View>
      ))}
    </View>
  );
}
