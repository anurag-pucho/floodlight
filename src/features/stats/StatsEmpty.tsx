import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Text } from '../../components/Text';
import { CricketBall } from '../../components/CricketBall';
import { TapButton } from '../../components/TapButton';
import { statsCopy } from './copy';

export function StatsEmpty({ onNewMatch }: { onNewMatch: () => void }) {
  const { spacing } = useTheme();
  const { t, lang } = useT();
  return (
    <View testID="stats-empty" style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing['2xl'] }}>
      <CricketBall size={96} />
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {statsCopy('emptyTitle', lang)}
      </Text>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        {statsCopy('emptyBody', lang)}
      </Text>
      <TapButton label={t('newMatch')} onPress={onNewMatch} haptic="medium" />
    </View>
  );
}
