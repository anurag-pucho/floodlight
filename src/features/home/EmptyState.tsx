import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Text } from '../../components/Text';
import { CricketBall } from '../../components/CricketBall';
import { TapButton } from '../../components/TapButton';
import { homeCopy } from './copy';

export function EmptyState({ onNewMatch }: { onNewMatch: () => void }) {
  const { spacing } = useTheme();
  const { t, lang } = useT();
  return (
    <View testID="matches-empty" style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing['2xl'] }}>
      <CricketBall size={96} />
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {homeCopy('emptyTitle', lang)}
      </Text>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        {homeCopy('emptyBody', lang)}
      </Text>
      <TapButton label={t('newMatch')} onPress={onNewMatch} haptic="medium" />
    </View>
  );
}
