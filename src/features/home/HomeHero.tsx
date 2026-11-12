import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { CricketBall } from '../../components/CricketBall';

export function HomeHero() {
  const { spacing } = useTheme();
  const { t } = useT();
  return (
    <Surface gradient elevation="medium" testID="home-hero">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="label" color="primary" style={{ letterSpacing: 2 }}>
            {t('appName').toUpperCase()}
          </Text>
          <Text variant="body" color="textSecondary">
            {t('tagline')}
          </Text>
        </View>
        <CricketBall size={84} />
      </View>
    </Surface>
  );
}
