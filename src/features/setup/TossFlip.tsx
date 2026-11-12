import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { battingFirstFrom, type Side, type TossInput } from './buildConfig';
import { useSetupT } from './setupStrings';

export interface TossFlipProps {
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  toss: Partial<TossInput>;
  onChange: (toss: Partial<TossInput>) => void;
  /** Injectable for deterministic tests: < 0.5 lands heads (first team wins). */
  random?: () => number;
}

const FLIP_MS = 1400;
const COIN = 148;

interface ChoiceCardProps {
  testID: string;
  label: string;
  caption?: string;
  selected: boolean;
  accent?: string;
  onPress: () => void;
}

function ChoiceCard({ testID, label, caption, selected, accent, onPress }: ChoiceCardProps) {
  const { colors, spacing, radii, elevation } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={{
        flex: 1,
        minHeight: spacing['4xl'] * 2,
        padding: spacing.lg,
        gap: spacing.sm,
        justifyContent: 'center',
        borderRadius: radii.lg,
        backgroundColor: selected ? colors.surfaceAlt : colors.surface,
        borderWidth: selected ? spacing.xs / 2 : elevation.hairlineWidth,
        borderColor: selected ? colors.primary : colors.hairline,
      }}
    >
      {accent ? (
        <View
          style={{
            width: spacing.lg,
            height: spacing.lg,
            borderRadius: radii.pill,
            backgroundColor: accent,
          }}
        />
      ) : null}
      <Text variant="heading" numberOfLines={2} color={selected ? 'primary' : 'textPrimary'}>
        {label}
      </Text>
      {caption ? (
        <Text variant="caption" color="textSecondary">
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function TossFlip({
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  toss,
  onChange,
  random = Math.random,
}: TossFlipProps) {
  const { colors, spacing, radii, elevation } = useTheme();
  const st = useSetupT();
  const angle = useSharedValue(0);
  const lift = useSharedValue(0);
  const grow = useSharedValue(1);
  const angleRef = useRef(0);
  const [landed, setLanded] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const coin = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: lift.value },
      { scale: grow.value },
      { rotateX: `${angle.value}deg` },
    ],
  }));
  const shadow = useAnimatedStyle(() => ({
    opacity: 0.35 - Math.min(0.25, Math.abs(lift.value) / 400),
    transform: [{ scaleX: 1 + lift.value / 400 }],
  }));

  const flip = (): void => {
    if (flipping) return;
    const heads = random() < 0.5;
    // Whole turns, then half a turn more if it should land tails (rotateX 180 shows the back face).
    const base = Math.ceil(angleRef.current / 360) * 360;
    const target = base + 360 * 5 + (heads ? 0 : 180);
    angleRef.current = target;
    setFlipping(true);
    setLanded(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    angle.value = withTiming(target, {
      duration: FLIP_MS,
      easing: Easing.out(Easing.cubic),
    });
    lift.value = withSequence(
      withTiming(-96, {
        duration: FLIP_MS * 0.45,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, { duration: FLIP_MS * 0.55, easing: Easing.bounce }),
    );
    grow.value = withSequence(
      withTiming(1.18, { duration: FLIP_MS * 0.45 }),
      withTiming(1, { duration: FLIP_MS * 0.55 }),
    );
    onChange({ ...toss, winner: heads ? 'A' : 'B' });
    timer.current = setTimeout(() => {
      setFlipping(false);
      setLanded(heads ? 'heads' : 'tails');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, FLIP_MS);
  };

  const face = {
    position: 'absolute',
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderWidth: spacing.sm,
    borderColor: colors.surfaceAlt,
    backfaceVisibility: 'hidden',
  } as const;

  const sides: { side: Side; name: string; color?: string }[] = [
    { side: 'A', name: teamAName, color: teamAColor },
    { side: 'B', name: teamBName, color: teamBColor },
  ];

  const section = (title: string, children: ReactNode) => (
    <View style={{ gap: spacing.md }}>
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );

  const battingFirst =
    toss.winner && toss.choice ? battingFirstFrom({ winner: toss.winner, choice: toss.choice }) : null;

  return (
    <View style={{ gap: spacing['2xl'] }}>
      <View style={{ alignItems: 'center', gap: spacing.lg }}>
        <View
          style={{
            height: COIN + spacing['4xl'] * 2,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Animated.View
            testID="toss-ball"
            style={[
              {
                position: 'absolute',
                bottom: spacing['3xl'],
                width: COIN,
                height: COIN,
                ...elevation.high,
              },
              coin,
            ]}
          >
            <View style={face}>
              <Text variant="display" color="onPrimary">
                {st('heads').charAt(0)}
              </Text>
            </View>
            <View style={[face, { transform: [{ rotateX: '180deg' }] }]}>
              <Text variant="display" color="onPrimary">
                {st('tails').charAt(0)}
              </Text>
            </View>
          </Animated.View>
          <Animated.View
            style={[
              {
                width: COIN * 0.7,
                height: spacing.md,
                borderRadius: radii.pill,
                backgroundColor: colors.textPrimary,
              },
              shadow,
            ]}
          />
        </View>
        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          {st('coinHint')}
        </Text>
        {landed ? (
          <Text variant="heading" color="gold" testID="toss-landed">
            {landed === 'heads' ? st('heads') : st('tails')}
          </Text>
        ) : null}
        <TapButton
          testID="toss-flip"
          label={landed || flipping ? st('flipAgain') : st('flip')}
          variant="primary"
          disabled={flipping}
          onPress={flip}
          style={{ alignSelf: 'stretch' }}
        />
      </View>

      {section(
        st('tossWinner'),
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {sides.map(({ side, name, color }) => (
            <ChoiceCard
              key={side}
              testID={`toss-winner-${side}`}
              label={name}
              accent={color}
              selected={toss.winner === side}
              onPress={() => onChange({ ...toss, winner: side })}
            />
          ))}
        </View>,
      )}

      {toss.winner
        ? section(
            st('tossBatOrBowl'),
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {(['bat', 'bowl'] as const).map((c) => (
                <ChoiceCard
                  key={c}
                  testID={`toss-choice-${c}`}
                  label={st(c)}
                  selected={toss.choice === c}
                  onPress={() => onChange({ ...toss, choice: c })}
                />
              ))}
            </View>,
          )
        : null}

      {battingFirst ? (
        <Text variant="heading" color="primary" testID="toss-result">
          {`${battingFirst === 'A' ? teamAName : teamBName} ${st('battingFirst')}`}
        </Text>
      ) : null}
    </View>
  );
}
