import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

export interface CricketBallProps {
  size: number;
  color?: string;
  seamColor?: string;
}

interface Pt {
  x: number;
  y: number;
}

/** Cubic bezier point + unit normal at t. */
function sample(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number) {
  const u = 1 - t;
  const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
  const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
  const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / len, ny: dx / len };
}

/** One seam: a curved cubic path plus short stitch ticks perpendicular to it. */
function seamGeometry(offset: number, bulge: number) {
  const p0 = { x: 50 + offset, y: 6 };
  const p1 = { x: 50 + offset + bulge * 1.33, y: 32 };
  const p2 = { x: 50 + offset + bulge * 1.33, y: 68 };
  const p3 = { x: 50 + offset, y: 94 };
  const d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  const ticks: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 1; i <= 10; i++) {
    const s = sample(p0, p1, p2, p3, i / 11);
    ticks.push({
      x1: s.x - s.nx * 3.4,
      y1: s.y - s.ny * 3.4,
      x2: s.x + s.nx * 3.4,
      y2: s.y + s.ny * 3.4,
    });
  }
  return { d, ticks };
}

const LEFT = seamGeometry(-3, -8); // bulges left of centre
const RIGHT = seamGeometry(3, 8); // bulges right of centre

/** Cricket ball in a 100x100 viewBox: leather body, soft shading, twin curved seams with stitches. */
export function CricketBall({ size, color, seamColor }: CricketBallProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const body = color ?? colors.secondary;
  const seam = seamColor ?? colors.ballSeam;
  return (
    <Svg
      testID="cricket-ball-svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel={t('a11yCricketBall')}
    >
      <Defs>
        <RadialGradient id="ballShade" cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </RadialGradient>
      </Defs>
      <Circle testID="cricket-ball-body" cx="50" cy="50" r="46" fill={body} />
      <Circle cx="50" cy="50" r="46" fill="url(#ballShade)" />
      {[LEFT, RIGHT].map((g, gi) => (
        <Path
          key={`seam${gi}`}
          testID="cricket-ball-seam"
          d={g.d}
          stroke={seam}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {[LEFT, RIGHT].flatMap((g, gi) =>
        g.ticks.map((t, i) => (
          <Line key={`t${gi}-${i}`} {...t} stroke={seam} strokeWidth={1.1} strokeLinecap="round" />
        )),
      )}
    </Svg>
  );
}
