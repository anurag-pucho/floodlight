import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { chaseStatus, runRate, target, teamTotal } from '../../../engine';
import type { MatchState } from '../../../engine';
import { Text } from '../../../components/Text';
import { useTheme } from '../../../theme/useTheme';
import { useScorecardT } from '../useScorecardT';

export function RunRatePanel({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { colors, spacing } = useTheme();
  const s = useScorecardT();
  const tgt = target(state);
  const chasing = inningsIndex === 1 && tgt !== null;
  const chase = inningsIndex === 1 ? chaseStatus(state) : null;
  const total = teamTotal(state, inningsIndex);
  const frac = chasing && tgt > 0 ? Math.min(1, total / tgt) : 0;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing['2xl'] }}>
        <View>
          <Text variant="caption" color="textSecondary">{s('currentRate', { rate: '' }).trim()}</Text>
          <Text variant="display" testID="run-rate-value" style={{ fontVariant: ['tabular-nums'] }}>
            {runRate(state, inningsIndex).toFixed(2)}
          </Text>
        </View>
        {chase ? (
          <View>
            <Text variant="caption" color="textSecondary">{s('requiredRate', { rate: '' }).trim()}</Text>
            <Text variant="display" color="secondary" testID="required-rate-value" style={{ fontVariant: ['tabular-nums'] }}>
              {chase.ballsRemaining > 0 && Number.isFinite(chase.requiredRunRate) ? chase.requiredRunRate.toFixed(2) : '-'}
            </Text>
          </View>
        ) : null}
      </View>
      {chasing ? (
        <View style={{ gap: spacing.xs }}>
          <Svg testID="chase-progress-svg" width="100%" viewBox="0 0 320 10" style={{ aspectRatio: 32 }}>
            <Rect x={0} y={0} width={320} height={10} rx={5} fill={colors.surfaceAlt} />
            <Rect testID="chase-progress-bar" x={0} y={0} width={320 * frac} height={10} rx={5} fill={colors.primary} />
          </Svg>
          <Text variant="caption" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
            {s('chaseProgress', { runs: total, target: tgt })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
