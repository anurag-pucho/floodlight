import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { Text } from '../../src/components/Text';
import { Surface } from '../../src/components/Surface';
import { Screen } from '../../src/components/Screen';
import { TapButton } from '../../src/components/TapButton';
import { CricketBall } from '../../src/components/CricketBall';
import { OverOrbs, type BallGlyph } from '../../src/components/OverOrbs';
import { Scoreboard } from '../../src/components/Scoreboard';

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('primitives mount', () => {
  it('Text', async () => {
    await wrap(<Text variant="heading">Hello</Text>);
    expect(screen.getByText('Hello')).toBeTruthy();
  });
  it('Surface (plain, gradient, blur)', async () => {
    await wrap(
      <>
        <Surface testID="s1"><Text>a</Text></Surface>
        <Surface testID="s2" gradient><Text>b</Text></Surface>
        <Surface testID="s3" blur><Text>c</Text></Surface>
      </>,
    );
    expect(screen.getByTestId('s1')).toBeTruthy();
    expect(screen.getByTestId('s2')).toBeTruthy();
    expect(screen.getByTestId('s3')).toBeTruthy();
  });
  it('Screen', async () => {
    await wrap(<Screen><Text>body</Text></Screen>);
    expect(screen.getByText('body')).toBeTruthy();
  });
  it('TapButton exposes button role and label', async () => {
    const onPress = jest.fn();
    await wrap(<TapButton label="Go" onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });
});

describe('CricketBall', () => {
  it('renders real SVG (Svg + Circle + seam Paths)', async () => {
    await wrap(<CricketBall size={80} />);
    expect(screen.getByTestId('cricket-ball-svg')).toBeTruthy();
    expect(screen.getByTestId('cricket-ball-body')).toBeTruthy();
    expect(screen.getAllByTestId('cricket-ball-seam').length).toBeGreaterThanOrEqual(2);
  });
});

describe('OverOrbs', () => {
  const ball = (kind: BallGlyph['kind']): BallGlyph => ({ kind });
  it('renders 6 filled orbs', async () => {
    await wrap(<OverOrbs balls={[ball('dot'), ball('run'), ball('four'), ball('six'), ball('wicket'), ball('extra')]} />);
    expect(screen.getAllByTestId('orb-filled')).toHaveLength(6);
    expect(screen.queryAllByTestId('orb-hollow')).toHaveLength(0);
  });
  it('renders 2 filled + 4 hollow', async () => {
    await wrap(<OverOrbs balls={[ball('four'), ball('dot')]} />);
    expect(screen.getAllByTestId('orb-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('orb-hollow')).toHaveLength(4);
  });
});

describe('Scoreboard', () => {
  it('shows runs, wickets and overs', async () => {
    await wrap(<Scoreboard runs={186} wickets={4} overs="18.3" />);
    expect(screen.getByTestId('scoreboard-runs')).toHaveTextContent('186');
    expect(screen.getByTestId('scoreboard-wickets')).toHaveTextContent('4');
    expect(screen.getByTestId('scoreboard-overs')).toHaveTextContent('18.3');
  });
});
