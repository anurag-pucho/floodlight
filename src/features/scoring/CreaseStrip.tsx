import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { useScoringT, type BowlerLine, type CreaseLine } from './useScoring';

export interface CreaseStripProps {
  striker: CreaseLine | null;
  nonStriker: CreaseLine | null;
  bowler: BowlerLine | null;
  /** When set, each batter gets a Retire control. */
  onRetire?: (id: string) => void;
  /** When set, the bowler row gets a Change bowler control. */
  onChangeBowler?: () => void;
}

const NONE = '-';

function Batter({
  line,
  strike,
  onRetire,
}: {
  line: CreaseLine | null;
  strike: boolean;
  onRetire?: (id: string) => void;
}) {
  const { colors, spacing, typography } = useTheme();
  const sc = useScoringT();
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {line ? (
          <Text
            variant="numeric"
            color={strike ? 'primary' : 'textSecondary'}
            style={{ fontSize: typography.body.fontSize }}
          >
            {`${line.runs} (${line.balls})`}
          </Text>
        ) : null}
        {line && onRetire ? (
          <Pressable
            testID={`retire-${line.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${sc('retire')} ${line.name}`}
            hitSlop={spacing.sm}
            onPress={() => onRetire(line.id)}
          >
            <Text variant="caption" color="textSecondary">
              {sc('retire')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function CreaseStrip({ striker, nonStriker, bowler, onRetire, onChangeBowler }: CreaseStripProps) {
  const sc = useScoringT();
  const { spacing, typography } = useTheme();
  return (
    <Surface gradient testID="crease-strip" style={{ gap: spacing.sm }}>
      <Batter line={striker} strike onRetire={onRetire} />
      <Batter line={nonStriker} strike={false} onRetire={onRetire} />
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}
      >
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {`${sc('bowler')}: ${bowler?.name ?? NONE}`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text variant="numeric" color="textSecondary" style={{ fontSize: typography.label.fontSize }}>
            {bowler?.figures ?? ''}
          </Text>
          {bowler && onChangeBowler ? (
            <Pressable testID="change-bowler" accessibilityRole="button" hitSlop={spacing.sm} onPress={onChangeBowler}>
              <Text variant="caption" color="textSecondary">
                {sc('changeBowler')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Surface>
  );
}
