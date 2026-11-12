import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import SetupScreen from '../../app/match/setup';

const mockPush = jest.fn();
const mockNewMatch = jest.fn();
let mockUid = 0;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => `u${++mockUid}` }));
jest.mock('../../src/store/matchStore', () => ({
  useMatchStore: (sel: (s: { newMatch: unknown }) => unknown) => sel({ newMatch: mockNewMatch }),
}));

const mount = () =>
  render(
    <ThemeProvider>
      <SetupScreen />
    </ThemeProvider>,
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
});
