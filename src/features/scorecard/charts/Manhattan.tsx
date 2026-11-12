import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { manhattan } from '../../../engine';
import type { MatchState } from '../../../engine';
import { useTheme } from '../../../theme/useTheme';
import { Text } from '../../../components/Text';
import { useScorecardT } from '../useScorecardT';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const W = 320;
const H = 150;
const PAD = { l: 8, r: 8, t: 14, b: 20 };
const BIG_OVER = 12;
const GOOD_OVER = 8;

function Bar({ x, w, baseY, h, fill, index }: { x: number; w: number; baseY: number; h: number; fill: string; index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * 40, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    // Restart the grow-in whenever the geometry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, index]);
  const animatedProps = useAnimatedProps(() => ({ y: baseY - h * p.value, height: h * p.value }));
  return (
    <AnimatedRect
      testID={`manhattan-bar-${index}`}
      x={x}
      width={w}
      rx={2}
      fill={fill}
      y={baseY - h}
      height={h}
      animatedProps={animatedProps}
    />
  );
}

export function Manhattan({ state, inningsIndex }: { state: MatchState; inningsIndex: 0 | 1 }) {
  const { colors } = useTheme();
  const s = useScorecardT();
  const data = manhattan(state, inningsIndex);
  if (data.length === 0) {
    return <Text variant="caption" color="textSecondary">{s('noChartData')}</Text>;
  }
  const slots = Math.max(data.length, state.config.rules.oversPerInnings);
  const maxRuns = Math.max(1, ...data.map((d) => d.runs));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const slot = plotW / slots;
  const barW = slot * 0.7;
  const baseY = PAD.t + plotH;
  const barHeight = (runs: number) => Math.max(runs === 0 ? 2 : 0, (runs / maxRuns) * plotH);
  const colorFor = (runs: number) =>
    runs >= BIG_OVER ? colors.six : runs >= GOOD_OVER ? colors.four : runs === 0 ? colors.dot : colors.run;
  return (
    <Svg testID="manhattan-svg" width="100%" viewBox={`0 0 ${W} ${H}`} style={{ aspectRatio: W / H }}>
      <Line x1={PAD.l} x2={W - PAD.r} y1={baseY} y2={baseY} stroke={colors.hairline} strokeWidth={1} />
      {data.map((d, i) => {
        const x = PAD.l + i * slot + (slot - barW) / 2;
        return <Bar key={d.over} index={i} x={x} w={barW} baseY={baseY} h={barHeight(d.runs)} fill={colorFor(d.runs)} />;
      })}
      {data.map((d, i) => {
        const cx = PAD.l + i * slot + slot / 2;
        return (
          <G key={`m${d.over}`}>
            {d.wickets > 0 ? (
              <Circle testID={`manhattan-wicket-${i}`} cx={cx} cy={baseY - barHeight(d.runs) - 6} r={3.5} fill={colors.wicket} />
            ) : null}
            {slots <= 10 || (i + 1) % 5 === 0 || i === 0 ? (
              <SvgText x={cx} y={H - 5} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                {String(i + 1)}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}
