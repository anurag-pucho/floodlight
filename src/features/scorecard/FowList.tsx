import { View } from 'react-native';
import { fallOfWickets } from '../../engine';
import type { MatchState } from '../../engine';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useScorecardT } from './useScorecardT';

export function FowList({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { spacing, fontFamily } = useTheme();
  const s = useScorecardT();
  const fows = fallOfWickets(state, inningsIndex);
  if (fows.length === 0) return null;
  return (
    <View testID="fow-list" style={{ gap: spacing.xs }}>
      <Text variant="label" color="primary">{s('fallOfWickets').toUpperCase()}</Text>
      {fows.map((f) => (
        <Text key={f.wicketNo} variant="caption" color="textSecondary" style={{ fontFamily: fontFamily.numeric }}>
          {s('fowEntry', {
            no: f.wicketNo,
            score: f.score,
            name: state.config.players[f.outPlayerId]?.name ?? f.outPlayerId,
            over: f.over,
          })}
        </Text>
      ))}
    </View>
  );
}
