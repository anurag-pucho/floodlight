import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Surface } from '../../../components/Surface';
import { Text } from '../../../components/Text';
import { useTheme } from '../../../theme/useTheme';

export function ChartCard({ title, children, testID }: { title: string; children: ReactNode; testID?: string }) {
  const { spacing } = useTheme();
  return (
    <Surface testID={testID} style={{ gap: spacing.md }}>
      <Text variant="label" color="primary">{title}</Text>
      <View>{children}</View>
    </Surface>
  );
}
