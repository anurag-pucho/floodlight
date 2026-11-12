import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';
import type { radii as radiiTokens } from '../theme/tokens';

export interface SurfaceProps {
  children?: ReactNode;
  radius?: keyof typeof radiiTokens;
  elevation?: 'low' | 'medium' | 'high';
  blur?: boolean;
  gradient?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Surface({
  children,
  radius = 'lg',
  elevation,
  blur = false,
  gradient = false,
  padded = true,
  style,
  testID,
}: SurfaceProps) {
  const { colors, radii, spacing, elevation: elev, scheme } = useTheme();
  const base: ViewStyle = {
    borderRadius: radii[radius],
    borderWidth: elev.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
    backgroundColor: blur || gradient ? 'transparent' : colors.surface,
    ...(elevation ? elev[elevation] : null),
  };
  return (
    <View testID={testID} style={[base, padded && { padding: spacing.lg }, style]}>
      {blur ? (
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {gradient ? (
        <LinearGradient
          colors={[colors.surfaceAlt, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}
