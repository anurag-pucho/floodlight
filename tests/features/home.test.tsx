import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { HomeScreen } from '../../app/index';
import { MatchesScreen, loadSavedMatches } from '../../app/matches';
import { rematchConfig } from '../../src/features/home/rematch';
import { DEFAULT_FILTERS, filterMatches } from '../../src/features/home/filterMatches';
import type { MatchConfig } from '../../src/engine';
import type { MatchRepo, MatchSummary } from '../../src/db/types';

const mockPush = jest.fn();
const mockNewMatch = jest.fn();
const mockRematchId = 'new-id';
const push = mockPush;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-id' }));
// Default store pulls the native DB lazily only when called; keep it inert.
jest.mock('../../src/store/matchStore', () => ({ matchStore: { getState: () => ({ resume: jest.fn(), newMatch: mockNewMatch }) } }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (ui: ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
beforeEach(() => {
  push.mockClear();
  mockNewMatch.mockClear();
});

describe('HomeScreen', () => {
  it('shows the Resume card only when a resumable match exists', async () => {
    const none = await wrap(<HomeScreen checkResumable={() => Promise.resolve(false)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'New Match' })).toBeTruthy());
    expect(screen.queryByTestId('resume-card')).toBeNull();
    await none.unmount();

    await wrap(<HomeScreen checkResumable={() => Promise.resolve(true)} />);
    await waitFor(() => expect(screen.getByTestId('resume-card')).toBeTruthy());
    await fireEvent.press(screen.getAllByRole('button', { name: 'Resume' })[0]!);
    expect(push).toHaveBeenCalledWith('/match/score');
  });

  it('routes New Match to setup and Matches to the list', async () => {
    await wrap(<HomeScreen checkResumable={() => Promise.resolve(false)} />);
    await fireEvent.press(screen.getByRole('button', { name: 'New Match' }));
    expect(push).toHaveBeenCalledWith('/match/setup');
    await fireEvent.press(screen.getByRole('button', { name: 'Matches' }));
    expect(push).toHaveBeenCalledWith('/matches');
  });
});

const prevConfig: MatchConfig = {
  id: 'old-id',
  teamA: {
    id: 'tA',
    name: 'Alpha',
    color: '#111111',
    players: [
      { playerId: 'p1', isShared: false, isCaptain: true },
      { playerId: 'p2', isShared: true, isWicketkeeper: true },
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
    p1: { id: 'p1', name: 'One' },
    p2: { id: 'p2', name: 'Two' },
    p3: { id: 'p3', name: 'Three' },
    p4: { id: 'p4', name: 'Four' },
  },
  rules: {
    oversPerInnings: 5,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitOnNoBall: true,
    lastManStands: false,
    byesEnabled: true,
  },
  battingFirst: 'A',
};

describe('rematchConfig', () => {
  it('fresh id, same squads/rules, swapped batting order', () => {
    const next = rematchConfig(prevConfig);
    expect(next.id).toBe(mockRematchId);
    expect(next.id).not.toBe(prevConfig.id);
    expect(next.teamA).toEqual(prevConfig.teamA);
    expect(next.teamB).toEqual(prevConfig.teamB);
    expect(next.players).toEqual(prevConfig.players);
    expect(next.rules).toEqual(prevConfig.rules);
    expect(next.battingFirst).toBe('B');
    expect(rematchConfig({ ...prevConfig, battingFirst: 'B' }).battingFirst).toBe('A');
  });
});

describe('MatchesScreen', () => {
  const summary = (id: string, over: Partial<MatchSummary> = {}): MatchSummary => ({
    id,
    teamAName: 'Alpha',
    teamBName: 'Bravo',
    overs: 5,
    status: 'in_progress',
    updatedAt: 1,
    ...over,
  });

  it('tapping a saved match opens its scorecard with the id', async () => {
    const entries = [{ summary: summary('m9'), result: null }];
    await wrap(<MatchesScreen load={() => Promise.resolve(entries)} />);
    const row = await screen.findByTestId('match-m9');
    await fireEvent.press(row);
    expect(push).toHaveBeenCalledWith({ pathname: '/match/scorecard', params: { id: 'm9' } });
  });

  it('Rematch on a completed match starts a new match and opens scoring', async () => {
    const entries = [{ summary: summary('m1', { status: 'complete' }), result: 'Alpha won', config: prevConfig }];
    await wrap(<MatchesScreen load={() => Promise.resolve(entries)} />);
    await fireEvent.press(await screen.findByTestId('rematch-m1'));
    expect(mockNewMatch).toHaveBeenCalledWith(rematchConfig(prevConfig));
    expect(push).toHaveBeenCalledWith('/match/score');
  });

  it('shows a crafted empty state when there are no matches', async () => {
    await wrap(<MatchesScreen load={() => Promise.resolve([])} />);
    expect(await screen.findByTestId('matches-empty')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'New Match' }));
    expect(push).toHaveBeenCalledWith('/match/setup');
  });

  it('lists newest first', async () => {
    const repo: MatchRepo = {
      saveMatch: jest.fn(),
      loadMatch: jest.fn().mockResolvedValue(null),
      getResumable: jest.fn(),
      deleteMatch: jest.fn(),
      listMatches: jest.fn().mockResolvedValue([summary('old', { updatedAt: 1 }), summary('new', { updatedAt: 9 })]),
    };
    const out = await loadSavedMatches(repo);
    expect(out.map((e) => e.summary.id)).toEqual(['new', 'old']);
  });
});

describe('filterMatches', () => {
  const mk = (id: string, status: MatchSummary['status'], updatedAt: number, a: string, b: string, config?: MatchConfig) => ({
    summary: { id, teamAName: a, teamBName: b, overs: 5, status, updatedAt } as MatchSummary,
    result: null,
    config,
  });
  const list = [
    mk('new', 'in_progress', 9, 'Lions', 'Tigers'),
    mk('mid', 'complete', 5, 'Alpha', 'Bravo', prevConfig),
    mk('old', 'complete', 1, 'Sharks', 'Eagles'),
  ];
  const ids = (l: ReturnType<typeof filterMatches>) => l.map((e) => e.summary.id);

  it('matches team names case-insensitively', () => {
    expect(ids(filterMatches(list, { ...DEFAULT_FILTERS, query: 'tIgEr' }))).toEqual(['new']);
  });
  it('matches player names via the config', () => {
    expect(ids(filterMatches(list, { ...DEFAULT_FILTERS, query: 'three' }))).toEqual(['mid']);
    expect(ids(filterMatches(list, { ...DEFAULT_FILTERS, query: 'zzz' }))).toEqual([]);
  });
  it('status filter keeps only that status', () => {
    expect(ids(filterMatches(list, { ...DEFAULT_FILTERS, status: 'complete' }))).toEqual(['mid', 'old']);
    expect(ids(filterMatches(list, { ...DEFAULT_FILTERS, status: 'in_progress' }))).toEqual(['new']);
  });
  it('sort reverses order and does not mutate input', () => {
    expect(ids(filterMatches(list, DEFAULT_FILTERS))).toEqual(['new', 'mid', 'old']);
    expect(ids(filterMatches(list, { ...DEFAULT_FILTERS, sort: 'oldest' }))).toEqual(['old', 'mid', 'new']);
    expect(ids(list)).toEqual(['new', 'mid', 'old']);
  });
});

describe('MatchesScreen search + filters', () => {
  const entries = [
    { summary: { id: 'a', teamAName: 'Lions', teamBName: 'Tigers', overs: 5, status: 'in_progress', updatedAt: 9 } as MatchSummary, result: null },
    { summary: { id: 'b', teamAName: 'Alpha', teamBName: 'Bravo', overs: 5, status: 'complete', updatedAt: 5 } as MatchSummary, result: 'Alpha won', config: prevConfig },
  ];

  it('typing narrows the list; a status chip filters; no match shows the no-results state', async () => {
    await wrap(<MatchesScreen load={() => Promise.resolve(entries)} />);
    expect(await screen.findByTestId('match-a')).toBeTruthy();
    expect(screen.getByTestId('match-b')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('matches-search'), 'alp');
    expect(screen.queryByTestId('match-a')).toBeNull();
    expect(screen.getByTestId('match-b')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('matches-search'), '');
    await fireEvent.press(screen.getByTestId('filter-status-in_progress'));
    expect(screen.getByTestId('match-a')).toBeTruthy();
    expect(screen.queryByTestId('match-b')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('matches-search'), 'nobody');
    expect(screen.getByTestId('matches-no-results')).toBeTruthy();
    expect(screen.queryByTestId('matches-empty')).toBeNull();

    await fireEvent.press(screen.getByTestId('matches-clear-filters'));
    expect(screen.getByTestId('match-a')).toBeTruthy();
    expect(screen.getByTestId('match-b')).toBeTruthy();
  });
});
