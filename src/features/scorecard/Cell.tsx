import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import type { Colors } from '../../theme/tokens';

export interface CellProps {
  children: ReactNode;
  /** Fixed width for numeric columns; omit for the flexible name column. */
  width?: number;
  header?: boolean;
  color?: keyof Colors;
  numeric?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const NUM_COL = 40;

/** One table cell; numeric cells use the monospaced face so columns align. */
export function Cell({ children, width, header = false, color, numeric = false, style }: CellProps) {
  const { fontFamily } = useTheme();
  const box: ViewStyle = width ? { width, alignItems: 'flex-end' } : { flex: 1 };
  return (
    <View style={[box, style]}>
      <Text
        variant="label"
        color={color ?? (header ? 'textMuted' : 'textPrimary')}
        numberOfLines={width ? 1 : 2}
        style={numeric && !header ? { fontFamily: fontFamily.numeric, fontVariant: ['tabular-nums'] } : undefined}
      >
        {children}
      </Text>
    </View>
  );
}
