import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic as fireHaptic } from '../prefs/haptic';
import { useTheme } from '../theme/useTheme';
import { Text } from './Text';

export type TapVariant = 'primary' | 'secondary' | 'ghost';
export type HapticLevel = 'light' | 'medium' | 'heavy' | 'none';

export interface TapButtonProps {
  label: string;
  onPress: () => void;
  variant?: TapVariant;
  haptic?: HapticLevel;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function TapButton({
  label,
  onPress,
  variant = 'primary',
  haptic = 'light',
  disabled = false,
  style,
  testID,
}: TapButtonProps) {
  const { colors, radii, spacing, elevation, typography } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.surfaceAlt : 'transparent';
  const fg =
    variant === 'primary' ? 'onPrimary' : variant === 'secondary' ? 'textPrimary' : 'primary';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
      onPress={() => {
        if (haptic !== 'none') fireHaptic(haptic);
        onPress();
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: bg,
            borderRadius: radii.lg,
            paddingVertical: spacing.lg,
            paddingHorizontal: spacing['2xl'],
            alignItems: 'center',
            borderWidth: variant === 'ghost' ? elevation.hairlineWidth : 0,
            borderColor: colors.hairline,
            opacity: disabled ? 0.5 : 1,
          },
          animated,
          style,
        ]}
      >
        <Text variant="label" color={fg} style={{ fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
