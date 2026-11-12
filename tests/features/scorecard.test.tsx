import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import ScorecardScreen from '../../app/match/scorecard';
import { matchStore } from '../../src/store/matchStore';
import { applyDelivery, createMatch } from '../../src/engine';
import type { DeliveryInput, MatchConfig, MatchState } from '../../src/engine';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: mockReplace, canGoBack: () => false }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const ids = ['a1', 'a2', 'b1', 'b2'];
const config: MatchConfig = {
  id: 'm1',
  teamA: { id: 'A', name: 'Alpha', color: '#f00', players: [{ playerId: 'a1', isShared: false, isCaptain: true }, { playerId: 'a2', isShared: false }] },
  teamB: { id: 'B', name: 'Bravo', color: '#00f', players: [{ playerId: 'b1', isShared: false, isCaptain: true }, { playerId: 'b2', isShared: false, isWicketkeeper: true }] },
  players: Object.fromEntries(ids.map((id) => [id, { id, name: id }])),
  rules: { oversPerInnings: 1, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
  battingFirst: 'A',
};

const bat = (striker: string, non: string, runsBat: number, extra: Partial<DeliveryInput> = {}): DeliveryInput => ({
  strikerId: striker,
  nonStrikerId: non,
  bowlerId: 'b1',
  runsBat,
  ...extra,
});

function seeded(): MatchState {
  let s = createMatch(config);
  const inn0: DeliveryInput[] = [
    bat('a1', 'a2', 4),
    bat('a1', 'a2', 6),
    bat('a1', 'a2', 0),
    bat('a1', 'a2', 1),
    bat('a2', 'a1', 2),
    bat('a2', 'a1', 0, { wicket: { type: 'stumped', outPlayerId: 'a2', fielderId: 'b2' } }),
  ];
  for (const d of inn0) s = applyDelivery(s, d);
  // Chase: b1 hits a four off a1.
  s = applyDelivery(s, { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a1', runsBat: 4 });
  return s;
}

const renderScreen = async () => {
  matchStore.setState({ state: seeded() });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <ScorecardScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
};

describe('scorecard screen', () => {
  it('shows the chase header in innings 2', async () => {
    await renderScreen();
    expect(screen.getByText('Need 10 off 5')).toBeTruthy();
    expect(screen.getByText('Target 14')).toBeTruthy();
    expect(screen.getByTestId('charts-panel')).toBeTruthy();
  });

  it('renders batting and bowling rows for the selected innings and switches', async () => {
    await renderScreen();
    // Defaults to the current (second) innings: b1 4 off 1, bowler a1 conceded 4 in 0.1.
    const b1 = within(screen.getByTestId('bat-row-b1'));
    expect(b1.getByText('4')).toBeTruthy();
    expect(b1.getByText('400.0')).toBeTruthy();
    const a1Bowl = within(screen.getByTestId('bowl-row-a1'));
    expect(a1Bowl.getByText('0.1')).toBeTruthy();
    expect(a1Bowl.getByText('24.00')).toBeTruthy();
    expect(screen.queryByTestId('bat-row-a1')).toBeNull();

    await fireEvent.press(screen.getByTestId('innings-tab-0'));

    const a1 = within(screen.getByTestId('bat-row-a1'));
    expect(a1.getByText('11')).toBeTruthy(); // runs
    expect(a1.getByText('275.0')).toBeTruthy(); // SR = 11 / 4
    expect(screen.getByText('st †b2 b b1')).toBeTruthy(); // a2 dismissal, keeper dagger kept
    const bowl = within(screen.getByTestId('bowl-row-b1'));
    expect(bowl.getByText('1.0')).toBeTruthy(); // overs
    expect(bowl.getByText('13')).toBeTruthy(); // runs
    expect(bowl.getByText('13.00')).toBeTruthy(); // economy
    expect(screen.getByTestId('innings-score')).toHaveTextContent('13/1');
    expect(screen.queryByText('Need 10 off 5')).toBeNull();
    expect(screen.getByTestId('fow-list')).toBeTruthy();
  });

  it('shows (C) and (WK) only on the marked players', async () => {
    await renderScreen();
    // Innings 2: b1 captain bats, b2 keeper bats; bowler a1 is captain of A.
    expect(within(screen.getByTestId('bat-row-b1')).getByText('(C)')).toBeTruthy();
    expect(within(screen.getByTestId('bat-row-b1')).queryByText('(WK)')).toBeNull();
    expect(within(screen.getByTestId('bat-row-b2')).getByText('(WK)')).toBeTruthy();
    expect(within(screen.getByTestId('bowl-row-a1')).getByText('(C)')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('innings-tab-0'));
    const a2 = within(screen.getByTestId('bat-row-a2'));
    expect(a2.queryByText('(C)')).toBeNull();
    expect(a2.queryByText('(WK)')).toBeNull();
    expect(within(screen.getByTestId('bowl-row-b1')).getByText('(C)')).toBeTruthy();
    expect(within(screen.getByTestId('bowl-row-b1')).queryByText('(WK)')).toBeNull();
  });

  it('header Home navigates', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('header-home'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
