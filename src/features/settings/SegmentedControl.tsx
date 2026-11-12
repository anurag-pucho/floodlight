import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../../components/Text';

export interface Segment<V extends string> {
  value: V;
  label: string;
  testID?: string;
}

export interface SegmentedControlProps<V extends string> {
  segments: readonly Segment<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  testID?: string;
}

/** Themed single-choice control (radio group semantics). */
export function SegmentedControl<V extends string>({
  segments,
  value,
  onChange,
  label,
  testID,
}: SegmentedControlProps<V>) {
  const { colors, radii, spacing, elevation } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        padding: spacing.xs,
        gap: spacing.xs,
        borderRadius: radii.pill,
        borderWidth: elevation.hairlineWidth,
        borderColor: colors.hairline,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      {segments.map((s) => {
        const selected = s.value === value;
        return (
          <Pressable
            key={s.value}
            testID={s.testID}
            accessibilityRole="radio"
            accessibilityLabel={s.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(s.value)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: selected ? colors.primary : 'transparent',
            }}
          >
            <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
