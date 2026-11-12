import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { SetupScreen, type SetupScreenProps } from '../../app/match/setup';
import type { MatchState } from '../../src/engine';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNewMatch = jest.fn();
let mockUid = 0;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => `u${++mockUid}` }));
jest.mock('../../src/store/matchStore', () => ({
  useMatchStore: (sel: (s: { newMatch: unknown }) => unknown) => sel({ newMatch: mockNewMatch }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const mount = (props: SetupScreenProps = {}) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <SetupScreen {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const type = (id: string, v: string) => fireEvent.changeText(screen.getByTestId(id), v);

/** Moves past the shared step (no shared players) to Team A. */
async function toTeamA() {
  await press('setup-next');
}

async function fillTeam(side: 'A' | 'B', name: string, p1: string, p2: string) {
  await type(`team-${side}-name`, name);
  await type(`team${side}-player-0`, p1);
  await type(`team${side}-player-1`, p2);
}

beforeEach(() => {
  mockPush.mockClear();
  mockNewMatch.mockClear();
  mockReplace.mockClear();
  mockUid = 0;
});

describe('setup wizard', () => {
  it('fills the wizard, submits, calls newMatch and navigates', async () => {
    await mount();
    await press('shared-add');
    await type('shared-player-0', 'Sam');
    await press('setup-next');
    await fillTeam('A', 'Lions', 'Asha', 'Bo');
    await press('setup-next');
    await fillTeam('B', 'Tigers', 'Cy', 'Di');
    await press('setup-next');
    await type('rule-overs', '5');
    await press('setup-next');
    await press('toss-winner-B');
    await press('toss-choice-bat');
    await press('setup-start');

    expect(mockNewMatch).toHaveBeenCalledTimes(1);
    const config = mockNewMatch.mock.calls[0][0];
    expect(config.teamA.name).toBe('Lions');
    expect(config.teamB.name).toBe('Tigers');
    expect(config.rules.oversPerInnings).toBe(5);
    expect(config.battingFirst).toBe('B');
    expect(config.teamA.players).toHaveLength(3);
    expect(config.teamB.players).toHaveLength(3);
    expect(mockPush).toHaveBeenCalledWith('/match/score');
  });

  it('blocks an empty team name', async () => {
    await mount();
    await toTeamA();
    await type('teamA-player-0', 'Asha');
    await type('teamA-player-1', 'Bo');
    await press('setup-next');
    expect(screen.getByTestId('error-teamNameEmpty')).toBeTruthy();
    expect(screen.getByTestId('team-A-name')).toBeTruthy();
  });

  it('blocks duplicate player names within a squad', async () => {
    await mount();
    await toTeamA();
    await fillTeam('A', 'Lions', 'Asha', 'asha');
    await press('setup-next');
    expect(screen.getByTestId('error-duplicatePlayer')).toBeTruthy();
    expect(mockNewMatch).not.toHaveBeenCalled();
  });

  it('blocks squads under 2 and overs under 1', async () => {
    await mount();
    await toTeamA();
    await fillTeam('A', 'Lions', 'Asha', '');
    await press('setup-next');
    expect(screen.getByTestId('error-squadTooSmall')).toBeTruthy();
    await type('teamA-player-1', 'Bo');
    await press('setup-next');
    await fillTeam('B', 'Tigers', 'Cy', 'Di');
    await press('setup-next');
    await type('rule-overs', '0');
    await press('setup-next');
    expect(screen.getByTestId('error-oversInvalid')).toBeTruthy();
  });

  it('marking a captain and keeper reflects in the built config', async () => {
    await mount();
    await press('setup-next');
    await fillTeam('A', 'Lions', 'Asha', 'Bo');
    await press('teamA-0-captain');
    await press('teamA-1-keeper');
    // choosing another captain replaces the first (never two)
    await press('teamA-1-captain');
    await press('setup-next');
    await fillTeam('B', 'Tigers', 'Cy', 'Di');
    await press('teamB-0-keeper');
    await press('setup-next');
    await press('setup-next');
    await press('toss-winner-A');
    await press('toss-choice-bowl');
    await press('setup-start');

    const c = mockNewMatch.mock.calls[0][0];
    const name = (id: string) => c.players[id].name;
    expect(
      c.teamA.players
        .filter((p: { isCaptain?: boolean }) => p.isCaptain)
        .map((p: { playerId: string }) => name(p.playerId)),
    ).toEqual(['Bo']);
    expect(
      c.teamA.players
        .filter((p: { isWicketkeeper?: boolean }) => p.isWicketkeeper)
        .map((p: { playerId: string }) => name(p.playerId)),
    ).toEqual(['Bo']);
    expect(
      c.teamB.players
        .filter((p: { isWicketkeeper?: boolean }) => p.isWicketkeeper)
        .map((p: { playerId: string }) => name(p.playerId)),
    ).toEqual(['Cy']);
    expect(c.teamB.players.some((p: { isCaptain?: boolean }) => p.isCaptain)).toBe(false);
    expect(c.battingFirst).toBe('B');
  });

  it('a renamed captain keeps the mark', async () => {
    await mount();
    await press('setup-next');
    await fillTeam('A', 'Lions', 'Asha', 'Bo');
    await press('teamA-0-captain');
    await type('teamA-player-0', 'Ashwin');
    expect(screen.getByTestId('teamA-0-captain').props.accessibilityState.selected).toBe(true);
  });

  it('prefills both squads from an injected saved match', async () => {
    const config = {
      id: 'm1',
      teamA: {
        id: 'ta',
        name: 'Royals',
        color: '#111111',
        players: [
          { playerId: 'p1', isShared: true },
          { playerId: 'p2', isShared: false, isCaptain: true },
          { playerId: 'p3', isShared: false, isWicketkeeper: true },
        ],
      },
      teamB: {
        id: 'tb',
        name: 'Kings',
        color: '#222222',
        players: [
          { playerId: 'p1', isShared: true },
          { playerId: 'p4', isShared: false },
        ],
      },
      players: {
        p1: { id: 'p1', name: 'Sam' },
        p2: { id: 'p2', name: 'Ravi' },
        p3: { id: 'p3', name: 'Tom' },
        p4: { id: 'p4', name: 'Uma' },
      },
      rules: {},
      battingFirst: 'A',
    };
    const repo = {
      listMatches: jest.fn().mockResolvedValue([
        {
          id: 'm1',
          teamAName: 'Royals',
          teamBName: 'Kings',
          overs: 10,
          status: 'complete',
          updatedAt: 5,
        },
      ]),
      loadMatch: jest.fn().mockResolvedValue({
        config,
        events: [],
        redo: [],
        seq: 0,
      } as unknown as MatchState),
    };
    await mount({ repo });
    await press('setup-use-previous');
    await waitFor(() => expect(screen.getByTestId('previous-match-m1')).toBeTruthy());
    await press('previous-match-m1');
    await waitFor(() => expect(screen.getByTestId('setup-loaded-previous')).toBeTruthy());
    expect(screen.getByTestId('shared-player-0').props.value).toBe('Sam');
    await press('setup-next');
    expect(screen.getByTestId('team-A-name').props.value).toBe('Royals');
    expect(screen.getByTestId('teamA-player-0').props.value).toBe('Ravi');
    expect(screen.getByTestId('teamA-0-captain').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('teamA-1-keeper').props.accessibilityState.selected).toBe(true);
    await press('setup-next');
    expect(screen.getByTestId('team-B-name').props.value).toBe('Kings');
    expect(screen.getByTestId('teamB-player-0').props.value).toBe('Uma');
  });

  it('the coin flip picks the toss winner and battingFirst follows the choice', async () => {
    await mount({ random: () => 0.9 }); // tails -> second team wins the toss
    await press('setup-next');
    await fillTeam('A', 'Lions', 'Asha', 'Bo');
    await press('setup-next');
    await fillTeam('B', 'Tigers', 'Cy', 'Di');
    await press('setup-next');
    await press('setup-next');
    await press('toss-flip');
    expect(screen.getByTestId('toss-winner-B').props.accessibilityState.selected).toBe(true);
    await press('toss-choice-bowl');
    await press('setup-start');
    expect(mockNewMatch.mock.calls[0][0].battingFirst).toBe('A');
  });

  it.each([
    ['tails', 0.9, 'B', 'Tails', 'T'],
    ['heads', 0.1, 'A', 'Heads', 'H'],
  ])('a forced %s flip lands that face and selects its team', async (_n, rnd, winner, label, letter) => {
    await mount({ random: () => rnd });
    await press('setup-next');
    await fillTeam('A', 'Lions', 'Asha', 'Bo');
    await press('setup-next');
    await fillTeam('B', 'Tigers', 'Cy', 'Di');
    await press('setup-next');
    await press('setup-next');
    // both faces render
    expect(screen.getByText('H')).toBeTruthy();
    expect(screen.getByText('T')).toBeTruthy();
    await press('toss-flip');
    expect(screen.getByTestId(`toss-winner-${winner}`).props.accessibilityState.selected).toBe(true);
    await waitFor(() => expect(screen.getByTestId('toss-landed')).toHaveTextContent(label), {
      timeout: 3000,
    });
    expect(screen.getByTestId(`toss-face-${label.toLowerCase()}`)).toBeTruthy();
    expect(letter).toBe(label.charAt(0));
  });

  it('header Home navigates to the root', async () => {
    await mount();
    await press('header-home');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
