import { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/tokens';

export interface BallGlyph {
  kind: 'dot' | 'run' | 'four' | 'six' | 'wicket' | 'extra';
  label?: string;
}

export interface OverOrbsProps {
  balls: BallGlyph[];
  /** Number of orb slots in the row (default 6). */
  max?: number;
  /** Orb diameter in px (default 40). */
  orbSize?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GAP_RATIO = 0.28;

const kindColor: Record<BallGlyph['kind'], keyof Colors> = {
  dot: 'dot',
  run: 'run',
  four: 'four',
  six: 'six',
  wicket: 'wicket',
  extra: 'extra',
};

function defaultLabel(b: BallGlyph): string {
  if (b.label !== undefined) return b.label;
  switch (b.kind) {
    case 'dot':
      return '•';
    case 'wicket':
      return 'W';
    case 'four':
      return '4';
    case 'six':
      return '6';
    default:
      return '';
  }
}

function FilledOrb({
  cx,
  cy,
  r,
  fill,
  index,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  index: number;
}) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(index * 40, withSpring(1, { damping: 7, stiffness: 220, mass: 0.6 }));
  }, [scale, index]);
  const animatedProps = useAnimatedProps(() => ({ r: r * scale.value }));
  return (
    <AnimatedCircle testID="orb-filled" cx={cx} cy={cy} fill={fill} animatedProps={animatedProps} />
  );
}

export function OverOrbs({ balls, max = 6, orbSize = 40 }: OverOrbsProps) {
  const { colors } = useTheme();
  const r = orbSize / 2 - 2;
  const gap = orbSize * GAP_RATIO;
  const width = max * orbSize + (max - 1) * gap;
  const cy = orbSize / 2;
  return (
    <Svg
      width={width}
      height={orbSize}
      viewBox={`0 0 ${width} ${orbSize}`}
      accessibilityRole="image"
      accessibilityLabel={`Over: ${balls.length} of ${max} balls`}
    >
      {Array.from({ length: max }, (_, i) => {
        const cx = orbSize / 2 + i * (orbSize + gap);
        const ball: BallGlyph | undefined = balls[i];
        if (!ball) {
          return (
            <Circle
              key={`h${i}`}
              testID="orb-hollow"
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={colors.hairline}
              strokeWidth={1.5}
            />
          );
        }
        const label = defaultLabel(ball);
        const darkText = ball.kind !== 'dot';
        return [
          <FilledOrb
            key={`f${i}-${ball.kind}`}
            cx={cx}
            cy={cy}
            r={r}
            fill={colors[kindColor[ball.kind]]}
            index={i}
          />,
          label ? (
            <SvgText
              key={`l${i}`}
              x={cx}
              y={cy + orbSize * 0.14}
              fontSize={orbSize * 0.4}
              fontWeight="700"
              textAnchor="middle"
              fill={darkText ? colors.bg : colors.textPrimary}
            >
              {label}
            </SvgText>
          ) : null,
        ];
      })}
    </Svg>
  );
}
