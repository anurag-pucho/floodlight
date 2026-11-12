import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { useScoringT, type BowlerLine, type CreaseLine } from './useScoring';

export interface CreaseStripProps {
  striker: CreaseLine | null;
  nonStriker: CreaseLine | null;
  bowler: BowlerLine | null;
}

const NONE = '-';

function Batter({ line, strike }: { line: CreaseLine | null; strike: boolean }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 }}>
        <View
          style={{
            width: spacing.sm,
            height: spacing.sm,
            borderRadius: spacing.xs,
            backgroundColor: strike ? colors.primary : 'transparent',
          }}
        />
        <Text variant="body" color={strike ? 'textPrimary' : 'textSecondary'} numberOfLines={1}>
          {line?.name ?? NONE}
        </Text>
      </View>
      {line ? (
        <Text
          variant="numeric"
          color={strike ? 'primary' : 'textSecondary'}
          style={{ fontSize: typography.body.fontSize }}
        >
          {`${line.runs} (${line.balls})`}
        </Text>
      ) : null}
    </View>
  );
}

export function CreaseStrip({ striker, nonStriker, bowler }: CreaseStripProps) {
  const sc = useScoringT();
  const { spacing, typography } = useTheme();
  return (
    <Surface gradient testID="crease-strip" style={{ gap: spacing.sm }}>
      <Batter line={striker} strike />
      <Batter line={nonStriker} strike={false} />
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}
      >
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {`${sc('bowler')}: ${bowler?.name ?? NONE}`}
        </Text>
        <Text variant="numeric" color="textSecondary" style={{ fontSize: typography.label.fontSize }}>
          {bowler?.figures ?? ''}
        </Text>
      </View>
    </Surface>
  );
}
