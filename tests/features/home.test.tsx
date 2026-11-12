import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { HomeScreen } from '../../app/index';
import { MatchesScreen, loadSavedMatches } from '../../app/matches';
import type { MatchRepo, MatchSummary } from '../../src/db/types';

const mockPush = jest.fn();
const push = mockPush;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
// Default store pulls the native DB lazily only when called; keep it inert.
jest.mock('../../src/store/matchStore', () => ({ matchStore: { getState: () => ({ resume: jest.fn() }) } }));

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);
beforeEach(() => push.mockClear());

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
