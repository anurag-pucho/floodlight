import { TextInput, View } from 'react-native';
import { Text } from '../../components/Text';
import { TapButton } from '../../components/TapButton';
import { useTheme } from '../../theme/useTheme';
import { useSetupT } from './setupStrings';

export interface SquadEditorProps {
  players: string[];
  onChange: (players: string[]) => void;
  /** Prefix for testIDs, e.g. "teamA". */
  testIDPrefix: string;
}

export function SquadEditor({ players, onChange, testIDPrefix }: SquadEditorProps) {
  const { colors, spacing, radii, typography, elevation } = useTheme();
  const st = useSetupT();

  return (
    <View style={{ gap: spacing.sm }}>
      {players.map((name, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="numeric" color="textMuted" style={{ width: spacing['2xl'] }}>
            {i + 1}
          </Text>
          <TextInput
            testID={`${testIDPrefix}-player-${i}`}
            accessibilityLabel={st('playerName')}
            placeholder={st('playerName')}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={(v) => onChange(players.map((p, j) => (j === i ? v : p)))}
            style={{
              flex: 1,
              color: colors.textPrimary,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radii.md,
              borderWidth: elevation.hairlineWidth,
              borderColor: colors.hairline,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
            }}
          />
          <TapButton
            testID={`${testIDPrefix}-remove-${i}`}
            label={st('removePlayer')}
            variant="ghost"
            haptic="none"
            onPress={() => onChange(players.filter((_, j) => j !== i))}
            style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
          />
        </View>
      ))}
      <TapButton
        testID={`${testIDPrefix}-add`}
        label={st('addPlayer')}
        variant="secondary"
        onPress={() => onChange([...players, ''])}
      />
    </View>
  );
}
