import { View } from 'react-native';
import type { MatchState } from '../../engine';
import { useTheme } from '../../theme/useTheme';
import { ChartCard } from './charts/ChartCard';
import { Manhattan } from './charts/Manhattan';
import { RunRatePanel } from './charts/RunRatePanel';
import { Worm } from './charts/Worm';
import { useScorecardT } from './useScorecardT';

export function ChartsPanel({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { spacing } = useTheme();
  const s = useScorecardT();
  return (
    <View testID="charts-panel" style={{ gap: spacing.lg }}>
      <ChartCard title={s('runRateTitle')}><RunRatePanel state={state} inningsIndex={inningsIndex} /></ChartCard>
      <ChartCard title={s('manhattanTitle')}><Manhattan state={state} inningsIndex={inningsIndex} /></ChartCard>
      <ChartCard title={s('wormTitle')}><Worm state={state} /></ChartCard>
    </View>
  );
}
