import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { haptic } from '../../prefs/haptic';
import Svg, { Circle, Line } from 'react-native-svg';
import { replayTo, teamTotal, wicketsDown } from '../../engine';
import type { BallRecord, MatchState } from '../../engine';
import { OverOrbs, type BallGlyph } from '../../components/OverOrbs';
import { Scoreboard } from '../../components/Scoreboard';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { ChartCard } from './charts/ChartCard';
import { useScorecardT } from './useScorecardT';

/** Milliseconds between balls while playing. */
export const REPLAY_TICK_MS = 700;
const BALLS_PER_OVER = 6;
const TRACK_H = 36;
const THUMB_R = 11;
const DEFAULT_WIDTH = 300;

type T = ReturnType<typeof useScorecardT>;

const EXTRA_SHORT = { wide: 'Wd', noball: 'Nb', bye: 'B', legbye: 'Lb' } as const;
const EXTRA_KEY = { wide: 'replayWide', noball: 'replayNoBall', bye: 'replayBye', legbye: 'replayLegBye' } as const;

function glyphFor(e: BallRecord): BallGlyph {
  if (e.wicket) return { kind: 'wicket' };
  if (e.extra) {
    const n = e.extra.type === 'noball' ? e.runsBat : e.extra.runs;
    const base = EXTRA_SHORT[e.extra.type];
    return { kind: 'extra', label: n > 0 ? `${base}${n}` : base };
  }
  if (e.runsBat === 0) return { kind: 'dot' };
  if (e.runsBat === 4) return { kind: 'four' };
  if (e.runsBat === 6) return { kind: 'six' };
  return { kind: 'run', label: String(e.runsBat) };
}

function describe(e: BallRecord, s: T): string {
  const over = `${e.overNumber}.${e.ballInOver}`;
  let what: string;
  if (e.wicket) what = s('replayWicket');
  else if (e.extra) what = s(EXTRA_KEY[e.extra.type], { n: e.extra.runs });
  else if (e.runsBat === 0) what = s('replayDot');
  else if (e.runsBat === 4) what = s('replayFour');
  else if (e.runsBat === 6) what = s('replaySix');
  else what = s('replayRuns', { n: e.runsBat });
  return s('replayBall', { over, what });
}

interface ScrubberProps {
  value: number;
  max: number;
  onChange: (k: number) => void;
  label: string;
}

/** Draggable SVG slider over whole steps 0..max; also operable via accessibility increment/decrement. */
function Scrubber({ value, max, onChange, label }: ScrubberProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const live = useRef({ max, onChange, width });
  live.current = { max, onChange, width };

  const pan = useMemo(() => {
    const fromX = (x: number) => {
      const { max: m, width: w } = live.current;
      const span = Math.max(1, w - THUMB_R * 2);
      return Math.round(Math.min(1, Math.max(0, (x - THUMB_R) / span)) * m);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => live.current.onChange(fromX(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => live.current.onChange(fromX(e.nativeEvent.locationX)),
    });
  }, []);

  const span = Math.max(1, width - THUMB_R * 2);
  const x = THUMB_R + (max === 0 ? 0 : (value / max) * span);
  const cy = TRACK_H / 2;
  return (
    <View
      testID="replay-scrubber"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const name = e.nativeEvent.actionName;
        if (name === 'increment') onChange(Math.min(max, value + 1));
        else if (name === 'decrement') onChange(Math.max(0, value - 1));
      }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: TRACK_H }}
      {...pan.panHandlers}
    >
      <Svg width={width} height={TRACK_H} pointerEvents="none">
        <Line x1={THUMB_R} x2={width - THUMB_R} y1={cy} y2={cy} stroke={colors.hairline} strokeWidth={4} strokeLinecap="round" />
        <Line x1={THUMB_R} x2={x} y1={cy} y2={cy} stroke={colors.primary} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={x} cy={cy} r={THUMB_R} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />
      </Svg>
    </View>
  );
}

export function Replay({ state, defaultOpen = false }: { state: MatchState; defaultOpen?: boolean }) {
  const { spacing } = useTheme();
  const s = useScorecardT();
  const total = state.events.length;
  const [open, setOpen] = useState(defaultOpen);
  const [k, setK] = useState(total);
  const [playing, setPlaying] = useState(false);

  // The ball log can shrink (undo) while mounted.
  const kk = Math.min(k, total);
  const setIndex = useCallback((n: number) => setK(Math.min(total, Math.max(0, n))), [total]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setK((cur) => {
        const next = Math.min(total, cur + 1);
        if (next !== cur) haptic('light');
        if (next >= total) setPlaying(false);
        return next;
      });
    }, REPLAY_TICK_MS);
    return () => clearInterval(id);
  }, [playing, total]);

  const view = useMemo(() => {
    const rs = replayTo(state, kk);
    const last = kk > 0 ? rs.events[kk - 1] : undefined;
    const inn = last ? last.inningsIndex : 0;
    const legal = rs.events.filter((e) => e.inningsIndex === inn && e.legal).length;
    const orbs = last
      ? rs.events.filter((e) => e.inningsIndex === inn && e.overNumber === last.overNumber).map(glyphFor)
      : [];
    return {
      runs: teamTotal(rs, inn),
      wickets: wicketsDown(rs, inn),
      overs: `${Math.floor(legal / BALLS_PER_OVER)}.${legal % BALLS_PER_OVER}`,
      orbs,
      last,
    };
  }, [state, kk]);

  const togglePlay = () => {
    if (!playing && kk >= total) setK(0);
    setPlaying((p) => !p);
  };

  return (
    <ChartCard title={s('replayTitle')} testID="replay-card">
      <View style={{ gap: spacing.md }}>
        <TapButton
          testID="replay-toggle"
          variant="ghost"
          haptic="none"
          label={open ? s('replayHide') : s('replayShow')}
          onPress={() => {
            setOpen((o) => !o);
            setPlaying(false);
          }}
        />
        {open && total === 0 ? <Text variant="caption" color="textSecondary">{s('noChartData')}</Text> : null}
        {open && total > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Scoreboard runs={view.runs} wickets={view.wickets} overs={view.overs} size={40} />
            <OverOrbs balls={view.orbs} max={Math.max(6, view.orbs.length)} orbSize={view.orbs.length > 6 ? 28 : 36} />
            <Text testID="replay-ball" variant="numeric" color="textSecondary">
              {view.last ? describe(view.last, s) : s('replayEmpty')}
            </Text>
            <Scrubber value={kk} max={total} onChange={setIndex} label={s('replayScrubA11y')} />
            <Text
              testID="replay-position"
              variant="numeric"
              color="textMuted"
              style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}
            >
              {s('replayPosition', { k: kk, n: total })}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TapButton testID="replay-prev" variant="secondary" label={s('replayPrev')} onPress={() => setIndex(kk - 1)} style={{ flex: 1 }} />
              <TapButton testID="replay-play" label={playing ? s('replayPause') : s('replayPlay')} onPress={togglePlay} style={{ flex: 1 }} />
              <TapButton testID="replay-next" variant="secondary" label={s('replayNext')} onPress={() => setIndex(kk + 1)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
      </View>
    </ChartCard>
  );
}
