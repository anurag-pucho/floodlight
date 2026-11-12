import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';

export interface ScreenProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Wrap body in a ScrollView with a visible indicator. Default true. */
  scroll?: boolean;
  /** Fixed header rendered above the (scrolling) body, e.g. <ScreenHeader/>. */
  header?: ReactNode;
}

export function Screen({ children, style, scroll = true, header }: ScreenProps) {
  const { colors, gradient, spacing, scheme } = useTheme();
  const pad = { padding: spacing.xl };
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[...gradient.pitch]} style={StyleSheet.absoluteFill} />
      {/* A header handles the top safe-area inset itself. */}
      <SafeAreaView style={styles.fill} edges={header ? ['left', 'right', 'bottom'] : undefined}>
        {header}
        {scroll ? (
          <ScrollView
            testID="screen-scroll"
            style={styles.fill}
            contentContainerStyle={[styles.grow, pad, { paddingBottom: spacing['2xl'] + spacing.xl }, style]}
            showsVerticalScrollIndicator={true}
            indicatorStyle={scheme === 'dark' ? 'white' : 'black'}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, pad, style]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 }, grow: { flexGrow: 1 } });
