import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { haptic } from '../prefs/haptic';
import { ChevronLeft, Home } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { Text } from './Text';

export interface ScreenHeaderProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  right?: ReactNode;
}

const TARGET = 44;

export function ScreenHeader({ title, showBack = true, showHome = true, right }: ScreenHeaderProps) {
  const { colors, spacing, radii } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goHome = () => router.replace('/');
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else goHome();
  };

  const control = (label: string, onPress: () => void, icon: ReactNode, testID: string) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.xs}
      onPress={() => {
        haptic('light');
        onPress();
      }}
      style={{
        width: TARGET,
        height: TARGET,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </Pressable>
  );

  const slot = { minWidth: TARGET * 2, flexDirection: 'row', alignItems: 'center' } as const;

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: TARGET + insets.top,
      }}
    >
      <View style={[slot, { justifyContent: 'flex-start' }]}>
        {showBack
          ? control(t('back'), goBack, <ChevronLeft size={26} color={colors.textPrimary} />, 'header-back')
          : null}
        {showHome
          ? control(t('home'), goHome, <Home size={22} color={colors.textPrimary} />, 'header-home')
          : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? (
          <Text variant="heading" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
      </View>
      <View style={[slot, { justifyContent: 'flex-end' }]}>{right}</View>
    </View>
  );
}
