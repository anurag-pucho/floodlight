import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { createMatchStore } from '../../src/store/matchStore';
import type { StoreRepo } from '../../src/store/types';
import { teamTotal, wicketsDown } from '../../src/engine';
import type { MatchConfig } from '../../src/engine';
import { useScoring } from '../../src/features/scoring/useScoring';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ScoreScreen from '../../app/match/score';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

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

function setup(rules: Partial<MatchConfig['rules']> = {}, tweak?: (c: MatchConfig) => MatchConfig) {
  const repo = {
    saveMatch: jest.fn().mockResolvedValue(undefined),
    loadMatch: jest.fn().mockResolvedValue(null),
    getResumable: jest.fn().mockResolvedValue(null),
  } satisfies StoreRepo;
  const store = createMatchStore({ getRepo: () => repo, debounceMs: 5 });
  store.getState().newMatch(tweak ? tweak(config(rules)) : config(rules));
  return { repo, store };
}

async function mount(store: ReturnType<typeof createMatchStore>) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <ScoreScreen store={store} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

async function openInnings(strikerId: string, nonId: string, bowlerId: string) {
  await press(`open-striker-${strikerId}`);
  await press(`open-non-${nonId}`);
  await press(`open-bowler-${bowlerId}`);
  await press('start-innings');
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

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

async function playOver(bowlerId?: string) {
  for (let i = 0; i < 6; i++) await press('run-0');
  if (bowlerId) await press(`pick-${bowlerId}`);
}

describe('scoring screen fixes', () => {
  it('bowler choices exclude the previous-over bowler and over-cap bowlers', async () => {
    const { store } = setup({ oversPerInnings: 3, maxOversPerBowler: 1 });
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await playOver();
    expect(screen.getByTestId('bowler-prompt')).toBeTruthy();
    expect(screen.queryByTestId('pick-b1')).toBeNull();
    expect(screen.getByTestId('pick-b2')).toBeTruthy();
    expect(screen.queryByTestId('prompt-hint')).toBeNull();
    await press('pick-b2');
    await playOver();
    expect(screen.queryByTestId('pick-b1')).toBeNull();
    expect(screen.queryByTestId('pick-b2')).toBeNull();
    expect(screen.getByTestId('pick-b3')).toBeTruthy();
    expect(screen.getByTestId('pick-b4')).toBeTruthy();
  });

  it('when the cap leaves nobody eligible it still excludes the previous bowler and shows a hint', async () => {
    const { store } = setup({ oversPerInnings: 5, maxOversPerBowler: 1 });
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await playOver();
    await press('pick-b2');
    await playOver();
    await press('pick-b3');
    await playOver();
    await press('pick-b4');
    await playOver();
    expect(screen.getByTestId('prompt-hint')).toBeTruthy();
    expect(screen.queryByTestId('pick-b4')).toBeNull();
    expect(screen.getByTestId('pick-b1')).toBeTruthy();
  });

  it('orbs are empty once an over completes', async () => {
    const { store } = setup({ oversPerInnings: 2 });
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    for (let i = 0; i < 6; i++) await press('run-0');
    expect(screen.queryAllByTestId('orb-filled')).toHaveLength(0);
  });

  it('undo from the new-batter prompt reverts the wicket and closes the prompt', async () => {
    const { store } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await press('wicket');
    await press('wicket-type-bowled');
    await press('wicket-confirm');
    expect(screen.getByText('Select new batter')).toBeTruthy();

    await press('prompt-undo');
    const s = store.getState().state!;
    expect(s.events).toHaveLength(0);
    expect(wicketsDown(s, 0)).toBe(0);
    expect(screen.queryByText('Select new batter')).toBeNull();
  });

  it('a rapid double submit on the last ball of an over records only one ball', async () => {
    const { store } = setup({ oversPerInnings: 2 });
    const { result } = await renderHook(() => useScoring(store));
    await act(async () => {
      result.current.begin('a1', 'a2', 'b1');
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        result.current.submit({ runsBat: 0 });
      });
    }
    let first = false;
    let second = true;
    await act(async () => {
      first = result.current.submit({ runsBat: 0 });
      second = result.current.submit({ runsBat: 0 });
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(store.getState().state!.events).toHaveLength(6);
  });

  it('header Home navigates to the home route', async () => {
    const { store } = setup();
    await mount(store);
    await press('header-home');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('shared players and keeper', () => {
  /** Adds shared player "s1" to both squads (and optionally marks b2 as Bravo's keeper). */
  const withShared = (c: MatchConfig): MatchConfig => ({
    ...c,
    teamA: { ...c.teamA, players: [...c.teamA.players, { playerId: 's1', isShared: true }] },
    teamB: {
      ...c.teamB,
      players: [
        ...c.teamB.players.map((p) => (p.playerId === 'b2' ? { ...p, isWicketkeeper: true } : p)),
        { playerId: 's1', isShared: true },
      ],
    },
    players: { ...c.players, s1: { id: 's1', name: 'P-s1' } },
  });

  it('a shared player who is batting is not offered as bowler; a non-shared player is', async () => {
    const { store } = setup({ oversPerInnings: 3 }, withShared);
    await mount(store);
    await openInnings('a1', 's1', 'b1');
    await playOver();
    expect(screen.getByTestId('bowler-prompt')).toBeTruthy();
    expect(screen.queryByTestId('pick-s1')).toBeNull();
    expect(screen.getByTestId('pick-b2')).toBeTruthy();
  });

  it('a shared player who has bowled this innings IS offered as a new batter', async () => {
    const { store } = setup({ oversPerInnings: 3 }, withShared);
    await mount(store);
    await openInnings('a1', 'a2', 's1');
    await playOver();
    await press('pick-b1');
    await press('wicket');
    await press('wicket-type-bowled');
    await press('wicket-confirm');
    expect(screen.getByText('Select new batter')).toBeTruthy();
    expect(screen.getByTestId('pick-s1')).toBeTruthy();
    expect(screen.getByTestId('pick-a3')).toBeTruthy();
  });

  it('a shared mid-over bowler is not offered as new batter until the over completes', async () => {
    const { store } = setup({ oversPerInnings: 3 }, withShared);
    await mount(store);
    await openInnings('a1', 'a2', 's1');
    await press('run-0');
    await press('wicket');
    await press('wicket-type-bowled');
    await press('wicket-confirm');
    expect(screen.getByText('Select new batter')).toBeTruthy();
    expect(screen.queryByTestId('pick-s1')).toBeNull();
    expect(screen.getByTestId('pick-a3')).toBeTruthy();
  });

  it('a shared player who is out is offered as a bowler again', async () => {
    const { store } = setup({ oversPerInnings: 3 }, withShared);
    await mount(store);
    await openInnings('s1', 'a1', 'b1');
    await press('wicket');
    await press('wicket-type-bowled');
    await press('wicket-confirm');
    await press('pick-a2');
    for (let i = 0; i < 5; i++) await press('run-0');
    expect(screen.getByTestId('bowler-prompt')).toBeTruthy();
    expect(screen.getByTestId('pick-s1')).toBeTruthy();
  });

  it('selecting stumped pre-fills the wicketkeeper as fielder', async () => {
    const { store } = setup({}, withShared);
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await press('wicket');
    await press('wicket-type-stumped');
    await press('wicket-confirm');
    expect(store.getState().state!.events[0].wicket).toMatchObject({ type: 'stumped', fielderId: 'b2' });
  });

  it('caught offers the keeper as a quick option but allows any fielder', async () => {
    const { store } = setup({}, withShared);
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await press('wicket');
    await press('wicket-type-caught');
    expect(screen.getByTestId('wicket-keeper-quick')).toBeTruthy();
    await press('wicket-fielder-b3');
    await press('wicket-confirm');
    expect(store.getState().state!.events[0].wicket).toMatchObject({ type: 'caught', fielderId: 'b3' });
  });

  it('a shared opener cannot also be the opening bowler, and vice versa', async () => {
    const { store } = setup({}, withShared);
    await mount(store);
    await press('open-striker-s1');
    await press('open-non-a2');
    await press('open-bowler-s1');
    await press('start-innings');
    expect(screen.getByTestId('innings-break')).toBeTruthy();
    expect(store.getState().state!.events).toHaveLength(0);
    // Reverse: bowler first, then he cannot be picked as an opener.
    await press('open-striker-a1');
    await press('open-bowler-s1');
    await press('open-striker-s1');
    await press('open-non-s1');
    await press('open-non-a2');
    await press('open-bowler-b1');
    await press('start-innings');
    expect(store.getState().state!.events).toHaveLength(0);
    await press('run-1');
    expect(store.getState().state!.events[0]).toMatchObject({ bowlerId: 'b1' });
  });

  it('stumped with no wicketkeeper leaves the fielder empty', async () => {
    const { store } = setup();
    await mount(store);
    await openInnings('a1', 'a2', 'b1');
    await press('wicket');
    await press('wicket-type-stumped');
    await press('wicket-confirm');
    expect(store.getState().state!.events[0].wicket?.fielderId).toBeUndefined();
  });
});

describe('milestone celebrations', () => {
  const seed = (store: ReturnType<typeof createMatchStore>, balls: { striker: string; non: string; runs: number; out?: boolean }[]) => {
    for (const b of balls) {
      store.getState().delivery({
        strikerId: b.striker,
        nonStrikerId: b.non,
        bowlerId: 'b1',
        runsBat: b.runs,
        ...(b.out ? { wicket: { type: 'bowled' as const, outPlayerId: b.striker } } : {}),
      });
    }
  };
  const sixes = Array.from({ length: 8 }, () => ({ striker: 'a1', non: 'a2', runs: 6 }));

  it('shows FIFTY when a batter reaches 50, and not again on later balls, dismiss or undo+rescore', async () => {
    const { store } = setup({ oversPerInnings: 10 });
    seed(store, sixes);
    await mount(store);
    expect(screen.queryByTestId('milestone-celebration')).toBeNull();

    await press('run-2');
    expect(screen.getByTestId('milestone-celebration')).toBeTruthy();
    expect(screen.getByText('FIFTY!')).toBeTruthy();
    expect(screen.getByTestId('milestone-player')).toHaveTextContent('P-a1');
    expect(screen.getByTestId('milestone-burst')).toBeTruthy();

    await press('milestone-dismiss');
    expect(screen.queryByTestId('milestone-celebration')).toBeNull();
    await press('run-4');
    expect(screen.queryByTestId('milestone-celebration')).toBeNull();

    await press('undo');
    await press('undo');
    await press('run-2');
    expect(screen.queryByTestId('milestone-celebration')).toBeNull();
  });

  it('shows a 3-FER when a bowler takes a third wicket', async () => {
    const { store } = setup({ oversPerInnings: 10 });
    seed(store, [
      { striker: 'a1', non: 'a2', runs: 0, out: true },
      { striker: 'a3', non: 'a2', runs: 0, out: true },
    ]);
    await mount(store);
    await press('pick-a4');
    await press('wicket');
    await press('wicket-type-bowled');
    await press('wicket-confirm');
    expect(screen.getByText('3-FER!')).toBeTruthy();
    expect(screen.getByTestId('milestone-player')).toHaveTextContent('P-b1');
  });
  it('defers a wicket milestone while the new-batter prompt is open, then shows it', async () => {
    const withA5 = (c: MatchConfig): MatchConfig => ({
      ...c,
      teamA: { ...c.teamA, players: [...c.teamA.players, { playerId: 'a5', isShared: false }] },
      players: { ...c.players, a5: { id: 'a5', name: 'P-a5' } },
    });
    const { store } = setup({ oversPerInnings: 10 }, withA5);
    seed(store, [
      { striker: 'a1', non: 'a2', runs: 0, out: true },
      { striker: 'a3', non: 'a2', runs: 0, out: true },
    ]);
    await mount(store);
    await press('pick-a4');
    await press('wicket');
    await press('wicket-type-bowled');
    await press('wicket-confirm');
    expect(screen.getByText('Select new batter')).toBeTruthy();
    expect(screen.queryByTestId('milestone-celebration')).toBeNull();

    await press('pick-a5');
    expect(screen.getByText('3-FER!')).toBeTruthy();
  });
});
