import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';

export function Screen({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, gradient, spacing } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[...gradient.pitch]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={[styles.fill, { padding: spacing.xl }, style]}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
