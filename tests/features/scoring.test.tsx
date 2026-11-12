import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { createMatchStore } from '../../src/store/matchStore';
import type { StoreRepo } from '../../src/store/types';
import { teamTotal, wicketsDown } from '../../src/engine';
import type { MatchConfig } from '../../src/engine';
import ScoreScreen from '../../app/match/score';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const ids = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4'];
const squad = (p: string) => [1, 2, 3, 4].map((n) => ({ playerId: `${p}${n}`, isShared: false }));
const config = (over: Partial<MatchConfig['rules']> = {}): MatchConfig => ({
  id: 'm1',
  teamA: { id: 'A', name: 'Alpha', color: '#f00', players: squad('a') },
  teamB: { id: 'B', name: 'Bravo', color: '#00f', players: squad('b') },
  players: Object.fromEntries(ids.map((id) => [id, { id, name: `P-${id}` }])),
  rules: { oversPerInnings: 1, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true, ...over },
  battingFirst: 'A',
});

function setup(rules: Partial<MatchConfig['rules']> = {}) {
  const repo = {
    saveMatch: jest.fn().mockResolvedValue(undefined),
    loadMatch: jest.fn().mockResolvedValue(null),
    getResumable: jest.fn().mockResolvedValue(null),
  } satisfies StoreRepo;
  const store = createMatchStore({ getRepo: () => repo, debounceMs: 5 });
  store.getState().newMatch(config(rules));
  return { repo, store };
}

async function mount(store: ReturnType<typeof createMatchStore>) {
  await render(
    <ThemeProvider>
      <ScoreScreen store={store} />
    </ThemeProvider>,
  );
}

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

async function openInnings(strikerId: string, nonId: string, bowlerId: string) {
  await press(`open-striker-${strikerId}`);
  await press(`open-non-${nonId}`);
  await press(`open-bowler-${bowlerId}`);
  await press('start-innings');
}

beforeEach(() => mockPush.mockClear());

describe('scoring screen', () => {
  it('tapping 4 records bat runs and updates total and orbs', async () => {
    const { store } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    expect(screen.queryAllByTestId('orb-filled')).toHaveLength(0);

    await press('run-4');

    const s = store.getState().state!;
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ runsBat: 4, strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' });
    expect(teamTotal(s, 0)).toBe(4);
    expect(screen.getByLabelText('4 for 0, 0.1 overs')).toBeTruthy();
    expect(screen.getAllByTestId('orb-filled')).toHaveLength(1);
    expect(screen.getByText('4 (1)')).toBeTruthy();
  });

  it('Wide then 2 sends a wide with 2 ran', async () => {
    const { store } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');

    await press('mod-wide');
    await press('run-2');

    const s = store.getState().state!;
    expect(s.events[0]).toMatchObject({ runsBat: 0, legal: false, extra: { type: 'wide', runs: 2 } });
    expect(teamTotal(s, 0)).toBe(3);
    expect(screen.getByLabelText('3 for 0, 0.0 overs')).toBeTruthy();
  });

  it('hides byes when disabled', async () => {
    const { store } = setup({ byesEnabled: false });
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    expect(screen.queryByTestId('mod-bye')).toBeNull();
    expect(screen.queryByTestId('mod-legbye')).toBeNull();
    expect(screen.getByTestId('mod-wide')).toBeTruthy();
  });

  it('wicket sheet records bowled and prompts for a new batter', async () => {
    const { store } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');

    await press('wicket');
    await press('wicket-type-bowled');
    await press('wicket-confirm');

    const s = store.getState().state!;
    expect(wicketsDown(s, 0)).toBe(1);
    expect(s.events[0].wicket).toEqual({ type: 'bowled', outPlayerId: 'a1' });
    expect(screen.getByText('Select new batter')).toBeTruthy();

    await press('pick-a3');
    expect(screen.queryByText('Select new batter')).toBeNull();
    await press('run-1');
    expect(store.getState().state!.events[1]).toMatchObject({ strikerId: 'a3', nonStrikerId: 'a2' });
  });

  it('free hit only offers run out / stumped', async () => {
    const { store } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await press('mod-noball');
    await press('run-0');
    expect(screen.getByTestId('free-hit')).toBeTruthy();

    await press('wicket');
    expect(screen.queryByTestId('wicket-type-bowled')).toBeNull();
    expect(screen.getByTestId('wicket-type-runout')).toBeTruthy();
    expect(screen.getByTestId('wicket-type-stumped')).toBeTruthy();
  });

  it('undo reverts the last ball in the UI', async () => {
    const { store } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await press('run-6');
    expect(screen.getByLabelText('6 for 0, 0.1 overs')).toBeTruthy();

    await press('undo');
    expect(store.getState().state!.events).toHaveLength(0);
    expect(screen.getByLabelText('0 for 0, 0.0 overs')).toBeTruthy();
    expect(screen.queryAllByTestId('orb-filled')).toHaveLength(0);

    await press('redo');
    expect(store.getState().state!.events).toHaveLength(1);
  });

  it('shows the innings break, then the result banner when the target is reached', async () => {
    const { store, repo } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    for (let i = 0; i < 6; i++) await press('run-1');

    expect(screen.getByText('Innings break')).toBeTruthy();
    expect(screen.getByText('Target 7')).toBeTruthy();
    expect(screen.getByText('Start 2nd innings')).toBeTruthy();

    await openInnings('b1', 'b2', 'a1');
    expect(screen.getByTestId('chase-line')).toHaveTextContent('Target 7 - Need 7 from 6 balls');
    await press('run-6');
    expect(screen.queryByTestId('result-banner')).toBeNull();
    await press('run-1');

    expect(screen.getByTestId('result-banner')).toBeTruthy();
    expect(screen.getByText('Bravo won by 3 wickets')).toBeTruthy();
    expect(repo.saveMatch).toHaveBeenLastCalledWith(expect.anything(), 'complete');

    await press('view-scorecard');
    expect(mockPush).toHaveBeenCalledWith('/match/scorecard');
  });
});
