import { View } from 'react-native';
import { teamExtras } from '../../engine';
import type { MatchState } from '../../engine';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { useScorecardT } from './useScorecardT';

export function ExtrasLine({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { spacing } = useTheme();
  const { t } = useT();
  const s = useScorecardT();
  const x = teamExtras(state, inningsIndex);
  return (
    <View testID="extras-line" style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text variant="label">{`${t('extras')} ${x.total}`}</Text>
      <Text variant="caption" color="textSecondary">
        {s('extrasDetail', { b: x.byes, lb: x.legByes, w: x.wides, nb: x.noBalls })}
      </Text>
    </View>
  );
}
