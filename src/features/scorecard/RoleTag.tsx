import { View } from 'react-native';
import { teamCaptainId, teamWicketkeeperId } from '../../engine';
import type { MatchConfig } from '../../engine';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useScorecardT } from './useScorecardT';

/** Name plus small muted (C) / (WK) chips for the player's side. */
export function NameWithRoles({
  config,
  side,
  playerId,
  name,
}: {
  config: MatchConfig;
  side: 'A' | 'B';
  playerId: string;
  name: string;
}) {
  const { spacing, radii, colors } = useTheme();
  const s = useScorecardT();
  const isC = teamCaptainId(config, side) === playerId;
  const isWk = teamWicketkeeperId(config, side) === playerId;
  const chip = (label: string, testID: string) => (
    <View
      key={testID}
      testID={testID}
      style={{
        paddingHorizontal: spacing.xs,
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      <Text variant="caption" color="textMuted">{label}</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
      <Text variant="label">{name}</Text>
      {isC ? chip(s('captainTag'), `role-c-${playerId}`) : null}
      {isWk ? chip(s('keeperTag'), `role-wk-${playerId}`) : null}
    </View>
  );
}
