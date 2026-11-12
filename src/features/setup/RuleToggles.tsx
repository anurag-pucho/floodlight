import { Switch, TextInput, View } from 'react-native';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import type { RulesInput } from './buildConfig';
import { useSetupT, type SetupStrings } from './setupStrings';

export interface RuleTogglesProps {
  rules: RulesInput;
  onChange: (rules: RulesInput) => void;
}

type NumKey = 'overs' | 'wideRuns' | 'noBallRuns' | 'maxOversPerBowler';
type BoolKey = 'freeHitOnNoBall' | 'lastManStands' | 'byesEnabled';

const NUMBERS: { key: NumKey; label: keyof SetupStrings }[] = [
  { key: 'overs', label: 'oversLabel' },
  { key: 'wideRuns', label: 'wideRuns' },
  { key: 'noBallRuns', label: 'noBallRuns' },
  { key: 'maxOversPerBowler', label: 'maxOvers' },
];
const BOOLS: { key: BoolKey; label: keyof SetupStrings }[] = [
  { key: 'freeHitOnNoBall', label: 'freeHit' },
  { key: 'lastManStands', label: 'lastMan' },
  { key: 'byesEnabled', label: 'byes' },
];

export function RuleToggles({ rules, onChange }: RuleTogglesProps) {
  const { colors, spacing, radii, typography, elevation } = useTheme();
  const st = useSetupT();

  return (
    <View style={{ gap: spacing.md }}>
      {NUMBERS.map(({ key, label }) => (
        <View
          key={key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <Text style={{ flex: 1 }}>{st(label)}</Text>
          <TextInput
            testID={`rule-${key}`}
            accessibilityLabel={st(label)}
            keyboardType="number-pad"
            value={String(rules[key] ?? 0)}
            onChangeText={(v) => {
              const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
              onChange({ ...rules, [key]: Number.isNaN(n) ? 0 : n });
            }}
            style={{
              width: spacing['4xl'] * 2,
              textAlign: 'center',
              color: colors.textPrimary,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radii.md,
              borderWidth: elevation.hairlineWidth,
              borderColor: colors.hairline,
              paddingVertical: spacing.sm,
              fontFamily: typography.numeric.fontFamily,
              fontSize: typography.numeric.fontSize,
            }}
          />
        </View>
      ))}
      {BOOLS.map(({ key, label }) => (
        <View
          key={key}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ flex: 1 }}>{st(label)}</Text>
          <Switch
            testID={`rule-${key}`}
            accessibilityLabel={st(label)}
            value={rules[key]}
            onValueChange={(v) => onChange({ ...rules, [key]: v })}
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>
      ))}
    </View>
  );
}
