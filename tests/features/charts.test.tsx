import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { ChartsPanel } from '../../src/features/scorecard/ChartsPanel';
import { applyDelivery, createMatch } from '../../src/engine';
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

function seeded(): MatchState {
  let s = createMatch(config);
  const inn0: DeliveryInput[] = [
    bat(4), bat(6), bat(0), bat(1), bat(2), bat(0),
    bat(1), bat(1), bat(1), bat(1), bat(1),
    bat(0, { wicket: { type: 'stumped', outPlayerId: 'a1', fielderId: 'b2' } }),
  ];
  for (const d of inn0) s = applyDelivery(s, d);
  s = applyDelivery(s, { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a1', runsBat: 4 });
  return s;
}

const renderPanel = async (state: MatchState, idx: 0 | 1) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <ChartsPanel state={state} inningsIndex={idx} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('ChartsPanel', () => {
  it('renders a manhattan bar per over with a wicket marker, inside an Svg', async () => {
    await renderPanel(seeded(), 0);
    expect(screen.getByTestId('manhattan-svg')).toBeTruthy();
    expect(screen.getByTestId('manhattan-bar-0')).toBeTruthy();
    expect(screen.getByTestId('manhattan-bar-1')).toBeTruthy();
    expect(screen.queryByTestId('manhattan-bar-2')).toBeNull();
    expect(screen.getAllByTestId(/^manhattan-bar-/)).toHaveLength(2);
    expect(screen.getAllByTestId(/^manhattan-wicket-/)).toHaveLength(1);
  });

  it('draws the worm as a Path for both innings with wicket dots', async () => {
    await renderPanel(seeded(), 0);
    expect(screen.getByTestId('worm-svg')).toBeTruthy();
    expect(screen.getByTestId('worm-path-0')).toBeTruthy();
    expect(screen.getByTestId('worm-path-1')).toBeTruthy();
    expect(screen.getByTestId('worm-wicket-0-1')).toBeTruthy();
  });

  it('shows the run rate and chase progress', async () => {
    await renderPanel(seeded(), 1);
    // 4 runs off 1 ball = 24.00; target 19, need 15 off 17 balls.
    expect(screen.getByTestId('run-rate-value')).toHaveTextContent('24.00');
    expect(screen.getByTestId('required-rate-value')).toHaveTextContent('5.29');
    expect(screen.getByTestId('chase-progress-svg')).toBeTruthy();
  });

  it('changes manhattan data when the innings changes', async () => {
    const state = seeded();
    const ui = (idx: 0 | 1) => (
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <ChartsPanel state={state} inningsIndex={idx} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
    const view = await render(ui(0));
    expect(screen.getAllByTestId(/^manhattan-bar-/)).toHaveLength(2);
    await view.rerender(ui(1));
    expect(screen.getAllByTestId(/^manhattan-bar-/)).toHaveLength(1);
  });
});
