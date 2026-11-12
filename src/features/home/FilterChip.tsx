import { Pressable } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../../components/Text';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

/** Themed selectable pill for the matches filters. */
export function FilterChip({ label, selected, onPress, testID }: FilterChipProps) {
  const { colors, radii, spacing, elevation } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.pill,
        borderWidth: elevation.hairlineWidth,
        borderColor: selected ? colors.primary : colors.hairline,
        backgroundColor: selected ? colors.primary : colors.surfaceAlt,
      }}
    >
      <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}
