import { View } from 'react-native';
import { chaseStatus, currentInningsIndex, matchResult, runRate, target } from '../../engine';
import type { MatchState } from '../../engine';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { useScorecardT } from './useScorecardT';

export function ChaseHeader({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { spacing } = useTheme();
  const { t } = useT();
  const s = useScorecardT();
  const tgt = target(state);
  const result = matchResult(state);
  const chase = chaseStatus(state);
  const crr = runRate(state, inningsIndex).toFixed(2);

  if (inningsIndex === 0 || tgt === null || currentInningsIndex(state) !== 1) {
    return (
      <Surface testID="chase-header">
        <Text variant="label" color="textSecondary">{s('currentRate', { rate: crr })}</Text>
      </Surface>
    );
  }

  const cfg = state.config;
  const winnerName = result.winner === 'A' ? cfg.teamA.name : cfg.teamB.name;
  let headline: string | null = null;
  if (result.decided) {
    headline = result.tie ? t('tied') : s('wonByLine', { team: winnerName, margin: result.margin ?? '' });
  }

  return (
    <Surface testID="chase-header" gradient>
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" color="textSecondary">{s('targetLine', { n: tgt })}</Text>
        {headline !== null ? (
          <Text variant="heading" color="primary">{headline}</Text>
        ) : chase ? (
          <>
            <Text variant="heading" color="primary">
              {s('needOff', { runs: chase.runsNeeded, balls: chase.ballsRemaining })}
            </Text>
            <Text variant="label" color="textSecondary">
              {`${s('requiredRate', { rate: chase.requiredRunRate.toFixed(2) })}  ${s('currentRate', { rate: crr })}`}
            </Text>
          </>
        ) : null}
      </View>
    </Surface>
  );
}
