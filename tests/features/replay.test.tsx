import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { Replay } from '../../src/features/scorecard/Replay';
import { applyDelivery, createMatch, replayTo, teamTotal, wicketsDown } from '../../src/engine';
import type { DeliveryInput, MatchConfig, MatchState } from '../../src/engine';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const ids = ['a1', 'a2', 'b1', 'b2'];
const config: MatchConfig = {
  id: 'm1',
  teamA: { id: 'A', name: 'Alpha', color: '#f00', players: [{ playerId: 'a1', isShared: false, isCaptain: true }, { playerId: 'a2', isShared: false }] },
  teamB: { id: 'B', name: 'Bravo', color: '#00f', players: [{ playerId: 'b1', isShared: false, isCaptain: true }, { playerId: 'b2', isShared: false, isWicketkeeper: true }] },
  players: Object.fromEntries(ids.map((id) => [id, { id, name: id }])),
  rules: { oversPerInnings: 3, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
  battingFirst: 'A',
};

const bat = (runsBat: number, extra: Partial<DeliveryInput> = {}): DeliveryInput => ({
  strikerId: 'a1',
  nonStrikerId: 'a2',
  bowlerId: 'b1',
  runsBat,
  ...extra,
});

// 4, 6, 0, 1, 2, 0 | 1 x5 | wicket  => after 4 balls: 11/0; final innings 0: 18/1
function seeded(): MatchState {
  let s = createMatch(config);
  const inn0: DeliveryInput[] = [
    bat(4), bat(6), bat(0), bat(1), bat(2), bat(0),
    bat(1), bat(1), bat(1), bat(1), bat(1),
    bat(0, { wicket: { type: 'stumped', outPlayerId: 'a1', fielderId: 'b2' } }),
  ];
  for (const d of inn0) s = applyDelivery(s, d);
  return s;
}

const renderReplay = async (state: MatchState) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <Replay state={state} defaultOpen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

// Scoreboard animates its digits via a worklet reaction (stubbed in jest), so assert on its
// props-derived accessibility label instead of the animated text.
const expectScore = (runs: number, wkts: number, overs: string) =>
  expect(screen.getByLabelText(`${runs} for ${wkts}, ${overs} overs`)).toBeTruthy();

const scrubTo = async (k: number, from: number) => {
  const scrubber = screen.getByTestId('replay-scrubber');
  const name = k > from ? 'increment' : 'decrement';
  for (let i = 0; i < Math.abs(k - from); i++) {
    await fireEvent(scrubber, 'accessibilityAction', { nativeEvent: { actionName: name } });
  }
};

describe('Replay', () => {
  it('renders the scrubber at the final ball with the final score', async () => {
    const state = seeded();
    await renderReplay(state);
    expect(screen.getByTestId('replay-scrubber')).toBeTruthy();
    const total = teamTotal(state, 0);
    expectScore(teamTotal(state, 0), wicketsDown(state, 0), '2.0');
    expect(screen.getByTestId('replay-position')).toHaveTextContent('12 / 12');
  });

  it('scrubbing to index k shows replayTo(state, k) totals', async () => {
    const state = seeded();
    await renderReplay(state);
    await scrubTo(4, 12);
    const mid = replayTo(state, 4);
    expect(teamTotal(mid, 0)).toBe(11);
    expectScore(11, 0, '0.4');
    expect(screen.getByTestId('replay-ball')).toHaveTextContent('0.4 - 1 RUN');
    await scrubTo(12, 4);
    expectScore(18, 1, '2.0');
    expect(screen.getByTestId('replay-ball')).toHaveTextContent('1.6 - WICKET');
  });

  it('describes a boundary ball', async () => {
    await renderReplay(seeded());
    await scrubTo(1, 12);
    expect(screen.getByTestId('replay-ball')).toHaveTextContent('0.1 - FOUR');
  });

  it('shows zero at the start', async () => {
    await renderReplay(seeded());
    await scrubTo(0, 12);
    expectScore(0, 0, '0.0');
    expect(screen.getByTestId('replay-position')).toHaveTextContent('0 / 12');
  });

  it('play advances by one ball per tick and pause stops it', async () => {
    jest.useFakeTimers();
    try {
      await renderReplay(seeded());
      await scrubTo(0, 12);
      await fireEvent.press(screen.getByTestId('replay-play'));
      await act(async () => { jest.advanceTimersByTime(700); });
      expect(screen.getByTestId('replay-position')).toHaveTextContent('1 / 12');
      await act(async () => { jest.advanceTimersByTime(700); });
      expect(screen.getByTestId('replay-position')).toHaveTextContent('2 / 12');
      await fireEvent.press(screen.getByTestId('replay-play'));
      await act(async () => { jest.advanceTimersByTime(3000); });
      expect(screen.getByTestId('replay-position')).toHaveTextContent('2 / 12');
    } finally {
      jest.useRealTimers();
    }
  });

  it('collapses and expands', async () => {
    await renderReplay(seeded());
    await fireEvent.press(screen.getByTestId('replay-toggle'));
    expect(screen.queryByTestId('replay-scrubber')).toBeNull();
    await fireEvent.press(screen.getByTestId('replay-toggle'));
    expect(screen.getByTestId('replay-scrubber')).toBeTruthy();
  });
});
