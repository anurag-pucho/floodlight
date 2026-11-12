import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const wrap = (ui: ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack = true;
});

describe('ScreenHeader', () => {
  it('renders title with Back and Home controls', async () => {
    await wrap(<ScreenHeader title="Settings" />);
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Home' })).toBeTruthy();
  });
  it('Home calls router.replace("/")', async () => {
    await wrap(<ScreenHeader title="x" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Home' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
  it('Back calls router.back() when possible, else goes home', async () => {
    await wrap(<ScreenHeader title="x" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockCanGoBack = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
  it('hides Back / Home when disabled and shows right slot', async () => {
    await wrap(<ScreenHeader title="x" showBack={false} showHome={false} right={<Text>R</Text>} />);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Home' })).toBeNull();
    expect(screen.getByText('R')).toBeTruthy();
  });
});

describe('Screen scrolling', () => {
  it('scroll renders a visible-indicator ScrollView', async () => {
    await wrap(<Screen scroll><Text>body</Text></Screen>);
    const sv = screen.getByTestId('screen-scroll');
    expect(sv.props.showsVerticalScrollIndicator).toBe(true);
    expect(sv.props.keyboardShouldPersistTaps).toBe('handled');
    expect(screen.getByText('body')).toBeTruthy();
  });
  it('scroll={false} has no ScrollView', async () => {
    await wrap(<Screen scroll={false}><Text>body</Text></Screen>);
    expect(screen.queryByTestId('screen-scroll')).toBeNull();
    expect(screen.getByText('body')).toBeTruthy();
  });
  it('header stays outside the scroll area', async () => {
    await wrap(<Screen header={<Text>HDR</Text>}><Text>body</Text></Screen>);
    expect(screen.getByText('HDR')).toBeTruthy();
    expect(screen.getByTestId('screen-scroll')).toBeTruthy();
  });
});
