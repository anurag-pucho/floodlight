import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { fallOfWickets, worm } from '../../../engine';
import type { MatchState } from '../../../engine';
import { Text } from '../../../components/Text';
import { useTheme } from '../../../theme/useTheme';
import { useScorecardT } from '../useScorecardT';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 320;
const H = 160;
const PAD = { l: 8, r: 10, t: 12, b: 10 };
const BALLS_PER_OVER = 6;

interface Pt { x: number; y: number }

function pathLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return Math.ceil(len) + 1;
}

function WormLine({ id, pts, stroke }: { id: string; pts: Pt[]; stroke: string }) {
  const len = pathLength(pts);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    // Redraw when the line changes shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len, pts.length]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  return (
    <AnimatedPath
      testID={`worm-path-${id}`}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[len, len]}
      strokeDashoffset={len}
      animatedProps={animatedProps}
    />
  );
}

export function Worm({ state }: { state: MatchState }) {
  const { colors } = useTheme();
  const s = useScorecardT();
  const series = ([0, 1] as const)
    .map((i) => ({ i, balls: worm(state, i), fow: fallOfWickets(state, i) }))
    .filter((x) => x.balls.length > 0);
  if (series.length === 0) {
    return <Text variant="caption" color="textSecondary">{s('noChartData')}</Text>;
  }
  const maxBalls = Math.max(
    state.config.rules.oversPerInnings * BALLS_PER_OVER,
    ...series.map((x) => x.balls[x.balls.length - 1].ball),
  );
  const maxRuns = Math.max(1, ...series.map((x) => x.balls[x.balls.length - 1].runs));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const px = (ball: number) => PAD.l + (ball / maxBalls) * plotW;
  const py = (runs: number) => PAD.t + plotH - (runs / maxRuns) * plotH;
  const colorOf = (i: 0 | 1) => (i === 0 ? colors.primary : colors.secondary);
  return (
    <Svg testID="worm-svg" width="100%" viewBox={`0 0 ${W} ${H}`} style={{ aspectRatio: W / H }}>
      <Line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke={colors.hairline} strokeWidth={1} />
      {series.map((x) => {
        const pts: Pt[] = [
          { x: px(0), y: py(0) },
          ...x.balls.filter((b) => b.ball > 0).map((b) => ({ x: px(b.ball), y: py(b.runs) })),
        ];
        return <WormLine key={x.i} id={String(x.i)} pts={pts} stroke={colorOf(x.i)} />;
      })}
      {series.flatMap((x) =>
        x.fow.map((f) => {
          const [ov, ball] = f.over.split('.').map(Number);
          return (
            <Circle
              key={`${x.i}-${f.wicketNo}`}
              testID={`worm-wicket-${x.i}-${f.wicketNo}`}
              cx={px(ov * BALLS_PER_OVER + ball)}
              cy={py(f.score)}
              r={3.5}
              fill={colors.wicket}
              stroke={colors.surface}
              strokeWidth={1}
            />
          );
        }),
      )}
    </Svg>
  );
}
