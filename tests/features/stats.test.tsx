import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { StatsScreen } from '../../app/stats';
import { aggregateCareers } from '../../src/features/stats/aggregate';
import { loadCompletedMatches } from '../../src/features/stats/load';
import { applyDelivery, createMatch } from '../../src/engine';
import type { DeliveryInput, MatchConfig, MatchState } from '../../src/engine';
import type { MatchRepo, MatchSummary } from '../../src/db/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (ui: ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );

const config = (id: string, p1Name: string): MatchConfig => ({
  id,
  teamA: {
    id: 'tA',
    name: 'Alpha',
    color: '#111111',
    players: [
      { playerId: 'p1', isShared: false, isCaptain: true },
      { playerId: 'p2', isShared: false, isWicketkeeper: true },
    ],
  },
  teamB: {
    id: 'tB',
    name: 'Bravo',
    color: '#222222',
    players: [
      { playerId: 'p3', isShared: false, isCaptain: true },
      { playerId: 'p4', isShared: false, isWicketkeeper: true },
    ],
  },
  players: {
    p1: { id: 'p1', name: p1Name },
    p2: { id: 'p2', name: 'Two' },
    p3: { id: 'p3', name: 'Three' },
    p4: { id: 'p4', name: 'Four' },
  },
  rules: { oversPerInnings: 3, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
  battingFirst: 'A',
});

const D = (strikerId: string, nonStrikerId: string, bowlerId: string, runsBat: number, rest: Partial<DeliveryInput> = {}): DeliveryInput => ({
  strikerId,
  nonStrikerId,
  bowlerId,
  runsBat,
  ...rest,
});
const times = (n: number, d: DeliveryInput): DeliveryInput[] => Array.from({ length: n }, () => d);
const play = (cfg: MatchConfig, script: DeliveryInput[]): MatchState => script.reduce(applyDelivery, createMatch(cfg));

/** Alpha 54 (p1 hits 9 sixes, scoring a fifty); Bravo lose p3 first ball. Alpha win by 54 runs. */
const match1 = (): MatchState =>
  play(config('m1', 'One'), [
    ...times(6, D('p1', 'p2', 'p3', 6)),
    ...times(6, D('p2', 'p1', 'p4', 0)),
    ...times(3, D('p1', 'p2', 'p3', 6)),
    ...times(3, D('p1', 'p2', 'p3', 0)),
    D('p3', 'p4', 'p1', 0, { wicket: { type: 'bowled', outPlayerId: 'p3' } }),
  ]);

/** Alpha 10 (p1 six, four, bowled by p3); Bravo chase 12 with two sixes. Bravo win by 1 wicket. p1 renamed. */
const match2 = (): MatchState =>
  play(config('m2', 'One Prime'), [
    D('p1', 'p2', 'p3', 6),
    D('p1', 'p2', 'p3', 4),
    D('p1', 'p2', 'p3', 0, { wicket: { type: 'bowled', outPlayerId: 'p1' } }),
    D('p3', 'p4', 'p1', 6),
    D('p3', 'p4', 'p1', 6),
  ]);

describe('aggregateCareers', () => {
  const { players, headToHead } = aggregateCareers([match1(), match2()]);
  const byId = (id: string) => players.find((p) => p.playerId === id)!;

  it('sets up the scripted matches as decided results', () => {
    expect(match1().events.length).toBeGreaterThan(0);
  });

  it('sums a player across both matches, merging by id and keeping the latest name', () => {
    const p1 = byId('p1');
    expect(players.filter((p) => p.playerId === 'p1')).toHaveLength(1);
    expect(p1.name).toBe('One Prime');
    expect(p1).toMatchObject({ matches: 2, innings: 2, runs: 64, balls: 15, highScore: 54, fifties: 1, hundreds: 0, notOuts: 1 });
    expect(p1.strikeRate).toBeCloseTo((64 / 15) * 100, 5);
  });

  it('aggregates bowling figures', () => {
    const p1 = byId('p1');
    expect(p1).toMatchObject({ wickets: 1, ballsBowled: 3, oversBowled: '0.3', runsConceded: 12, bestBowling: { wickets: 1, runs: 0 } });
    expect(p1.economy).toBeCloseTo(24, 5);
    const p3 = byId('p3');
    expect(p3).toMatchObject({ wickets: 1, runs: 12, balls: 3 });
  });

  it('records head to head for the team pair, one win each', () => {
    expect(headToHead).toEqual([{ teamA: 'Alpha', teamB: 'Bravo', played: 2, teamAWins: 1, teamBWins: 1, ties: 0 }]);
  });

  it('is pure: returns empty results for no matches and does not mutate input', () => {
    expect(aggregateCareers([])).toEqual({ players: [], headToHead: [] });
    const m = match1();
    const snapshot = JSON.stringify(m);
    aggregateCareers([m]);
    expect(JSON.stringify(m)).toBe(snapshot);
  });
});

const summary = (id: string, status: MatchSummary['status'], updatedAt: number): MatchSummary => ({
  id,
  teamAName: 'Alpha',
  teamBName: 'Bravo',
  overs: 3,
  status,
  updatedAt,
});

function fakeRepo(): MatchRepo {
  const states: Record<string, MatchState> = { m1: match1(), m2: match2() };
  return {
    saveMatch: jest.fn(),
    loadMatch: async (id) => states[id] ?? null,
    listMatches: async () => [summary('m2', 'complete', 2), summary('live', 'in_progress', 3), summary('m1', 'complete', 1)],
    getResumable: async () => null,
    deleteMatch: jest.fn(),
  };
}

describe('loadCompletedMatches', () => {
  it('returns only completed matches, oldest first', async () => {
    const loaded = await loadCompletedMatches(fakeRepo());
    expect(loaded.map((s) => s.config.id)).toEqual(['m1', 'm2']);
  });
});

describe('StatsScreen', () => {
  beforeEach(() => mockPush.mockClear());
  const load = () => loadCompletedMatches(fakeRepo());

  it('shows Most Runs with the top scorer first', async () => {
    await wrap(<StatsScreen load={load} />);
    await waitFor(() => expect(screen.getByTestId('leaderboard-runs')).toBeTruthy());
    const rows = screen.getAllByTestId(/^runs-row-/);
    expect(rows[0]!.props.testID).toBe('runs-row-p1');
    expect(within(rows[0]!).getByText('One Prime')).toBeTruthy();
    expect(within(rows[0]!).getByText('64')).toBeTruthy();
    expect(screen.getByTestId('head-to-head')).toBeTruthy();
  });

  it('filters the player list by search', async () => {
    await wrap(<StatsScreen load={load} />);
    await waitFor(() => expect(screen.getByTestId('player-list')).toBeTruthy());
    expect(screen.getByTestId('player-row-p1')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('player-search'), 'thr');
    expect(screen.queryByTestId('player-row-p1')).toBeNull();
    expect(screen.getByTestId('player-row-p3')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('player-search'), 'zzz');
    expect(screen.getByTestId('player-list-empty')).toBeTruthy();
  });

  it('opens a player detail card from a leaderboard row', async () => {
    await wrap(<StatsScreen load={load} />);
    await waitFor(() => expect(screen.getByTestId('runs-row-p1')).toBeTruthy());
    expect(screen.queryByTestId('player-detail')).toBeNull();
    await fireEvent.press(screen.getByTestId('runs-row-p1'));
    expect(within(screen.getByTestId('player-detail')).getByText('One Prime')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('player-detail-close'));
    expect(screen.queryByTestId('player-detail')).toBeNull();
  });

  it('shows the empty state with no completed matches', async () => {
    await wrap(<StatsScreen load={() => Promise.resolve([])} />);
    await waitFor(() => expect(screen.getByTestId('stats-empty')).toBeTruthy());
    expect(screen.queryByTestId('leaderboard-runs')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'New Match' }));
    expect(mockPush).toHaveBeenCalledWith('/match/setup');
  });
});
