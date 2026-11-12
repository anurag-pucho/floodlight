import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { format } from '../i18n/strings';
import { Text } from './Text';

export interface ScoreboardProps {
  runs: number;
  wickets: number;
  overs: string;
  /** Font size of the runs readout (default: theme score size). */
  size?: number;
}

/** LED-style hero readout. Monospace digits (Space Mono) so nothing shifts; runs count up on change. */
export function Scoreboard({ runs, wickets, overs, size }: ScoreboardProps) {
  const { typography, spacing } = useTheme();
  const { t } = useT();
  const [shown, setShown] = useState(runs);
  const value = useSharedValue(runs);
  const pop = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    value.value = withTiming(runs, { duration: 450, easing: Easing.out(Easing.cubic) });
    pop.value = withSequence(withTiming(1.08, { duration: 120 }), withTiming(1, { duration: 280 }));
  }, [runs, value, pop]);

  useAnimatedReaction(
    () => Math.round(value.value),
    (cur, prev) => {
      if (cur !== prev) scheduleOnRN(setShown, cur);
    },
  );

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const fontSize = size ?? typography.score.fontSize;
  const lineHeight = Math.round(fontSize * (typography.score.lineHeight / typography.score.fontSize));

  return (
    <View
      accessible
      accessibilityLabel={format(t('a11yScore'), { runs, wickets, overs })}
      style={{ alignItems: 'flex-start' }}
    >
      <Animated.View
        style={[{ flexDirection: 'row', alignItems: 'baseline', transformOrigin: 'left center' }, animated]}
      >
        <Text
          testID="scoreboard-runs"
          variant="numeric"
          style={{ fontSize, lineHeight, fontVariant: ['tabular-nums'] }}
        >
          {String(shown)}
        </Text>
        <Text
          variant="numeric"
          color="textMuted"
          style={{ fontSize, lineHeight }}
        >
          /
        </Text>
        <Text
          testID="scoreboard-wickets"
          variant="numeric"
          color="primary"
          style={{ fontSize, lineHeight }}
        >
          {String(wickets)}
        </Text>
      </Animated.View>
      <Text
        testID="scoreboard-overs"
        variant="numeric"
        color="textSecondary"
        style={{ marginTop: spacing.xs }}
      >
        {overs}
      </Text>
    </View>
  );
}
