import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { CricketBall } from '../../components/CricketBall';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import type { Colors } from '../../theme/tokens';
import { MILESTONE_KEY, useScoringT } from './useScoring';
import type { MilestoneKind } from '../../engine';

export const MILESTONE_DISPLAY_MS = 1800;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const SIZE = 280;
const C = SIZE / 2;
const RAYS = 16;
const PARTICLES = 20;
const PARTICLE_COLORS: readonly (keyof Colors)[] = ['gold', 'primary', 'secondary', 'four', 'six'];

export interface MilestoneCelebrationProps {
  kind: MilestoneKind;
  playerName: string;
  onDone: () => void;
}

interface BurstProps {
  progress: { value: number };
  colors: Colors;
}

/** Ray i of the starburst: a short line travelling outward and fading. */
function Ray({ progress, index, stroke }: { progress: { value: number }; index: number; stroke: string }) {
  const a = (index / RAYS) * Math.PI * 2;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const props = useAnimatedProps(() => {
    const p = progress.value;
    const near = 40 + 70 * p;
    const far = near + 26 * (1 - p) + 8;
    return {
      x1: C + cos * near,
      y1: C + sin * near,
      x2: C + cos * far,
      y2: C + sin * far,
      opacity: 1 - p * p,
    };
  });
  return <AnimatedLine animatedProps={props} stroke={stroke} strokeWidth={3} strokeLinecap="round" />;
}

/** Confetti dot i: flies out along a pseudo-random but deterministic path. */
function Particle({ progress, index, fill }: { progress: { value: number }; index: number; fill: string }) {
  const a = (index / PARTICLES) * Math.PI * 2 + (index % 3) * 0.17;
  const reach = 85 + (index % 4) * 14;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const props = useAnimatedProps(() => {
    const p = progress.value;
    const e = 1 - (1 - p) * (1 - p);
    return {
      cx: C + cos * reach * e,
      cy: C + sin * reach * e + 22 * p * p,
      r: 5 - 3 * p + (index % 2),
      opacity: 1 - p * p * p,
    };
  });
  return <AnimatedCircle animatedProps={props} fill={fill} />;
}

function Burst({ progress, colors }: BurstProps) {
  const ring = useAnimatedProps(() => ({
    r: 24 + 96 * progress.value,
    opacity: 0.9 * (1 - progress.value),
    strokeWidth: 10 - 8 * progress.value,
  }));
  const flash = useAnimatedProps(() => ({
    r: 70 * progress.value,
    opacity: 0.35 * (1 - progress.value),
  }));
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} testID="milestone-burst" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AnimatedCircle animatedProps={flash} cx={C} cy={C} fill={colors.gold} />
      <AnimatedCircle animatedProps={ring} cx={C} cy={C} fill="none" stroke={colors.gold} />
      {Array.from({ length: RAYS }, (_, i) => (
        <Ray key={`r${i}`} progress={progress} index={i} stroke={i % 2 === 0 ? colors.gold : colors.primary} />
      ))}
      {Array.from({ length: PARTICLES }, (_, i) => (
        <Particle key={`p${i}`} progress={progress} index={i} fill={colors[PARTICLE_COLORS[i % PARTICLE_COLORS.length]]} />
      ))}
    </Svg>
  );
}

/**
 * Milestone overlay: gold starburst + ring + confetti around a headline and the player's name.
 * Auto-dismisses; tap the card to dismiss early. The surrounding area is pointer-transparent so
 * scoring is never blocked.
 */
export function MilestoneCelebration({ kind, playerName, onDone }: MilestoneCelebrationProps) {
  const sc = useScoringT();
  const { colors, spacing, radii } = useTheme();
  const progress = useSharedValue(0);
  const pop = useSharedValue(0.6);
  const fade = useSharedValue(0);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    progress.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
    pop.value = withSpring(1);
    fade.value = withTiming(1, { duration: 180 });
    const timer = setTimeout(onDone, MILESTONE_DISPLAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: pop.value }] }));
  const headline = sc(MILESTONE_KEY[kind]);

  return (
    <View testID="milestone-celebration" pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <View pointerEvents="box-none" style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Burst progress={progress} colors={colors} />
        <Pressable
        testID="milestone-dismiss"
        accessibilityRole="button"
        accessibilityLabel={`${headline} ${playerName}. ${sc('milestoneDismiss')}`}
        onPress={onDone}
        >
        <Animated.View
          style={[
            {
              alignItems: 'center',
              gap: spacing.xs,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.xl,
              borderRadius: radii.xl,
              backgroundColor: colors.bgElevated,
              borderWidth: 2,
              borderColor: colors.gold,
            },
            cardStyle,
          ]}
        >
          <CricketBall size={spacing['4xl']} />
          <Text variant="display" color="gold" testID="milestone-headline">
            {headline}
          </Text>
          <Text variant="heading" testID="milestone-player" numberOfLines={1}>
              {playerName}
            </Text>
        </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
