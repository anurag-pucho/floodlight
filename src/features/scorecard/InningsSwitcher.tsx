import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useScorecardT } from './useScorecardT';

export interface InningsSwitcherProps {
  value: 0 | 1;
  onChange: (i: 0 | 1) => void;
  labels: [string, string];
}

/** Segmented control for innings 1 / innings 2. */
export function InningsSwitcher({ value, onChange, labels }: InningsSwitcherProps) {
  const { colors, radii, spacing } = useTheme();
  const s = useScorecardT();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, padding: spacing.xs }}
    >
      {([0, 1] as const).map((i) => {
        const active = value === i;
        return (
          <Pressable
            key={i}
            testID={`innings-tab-${i}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(i)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing.sm,
              borderRadius: radii.pill,
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text variant="label" color={active ? 'onPrimary' : 'textSecondary'}>
              {`${s('inningsN', { n: i + 1 })} · ${labels[i]}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
