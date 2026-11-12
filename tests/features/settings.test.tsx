import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeContext } from '../../src/theme/ThemeProvider';
import { buildTheme, type Scheme } from '../../src/theme/tokens';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
import { createPrefsStore, type KeyValueStorage } from '../../src/prefs/prefs';
import { getLang, setLang } from '../../src/i18n/useT';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function setup(scheme: Scheme = 'dark') {
  const data: Record<string, string> = {};
  const storage: KeyValueStorage = {
    getItem: (k) => Promise.resolve(data[k] ?? null),
    setItem: (k, v) => {
      data[k] = v;
      return Promise.resolve();
    },
  };
  const store = createPrefsStore(storage);
  const setScheme = jest.fn();
  const ui: ReactElement = (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeContext.Provider value={{ theme: buildTheme(scheme), scheme, setScheme, toggle: jest.fn() }}>
        <SettingsScreen store={store} />
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
  await render(ui);
  const saved = () => JSON.parse(Object.values(data)[0] ?? '{}') as Record<string, unknown>;
  return { store, setScheme, saved };
}

beforeEach(() => act(() => setLang('en')));

describe('SettingsScreen', () => {
  it('renders current values and the About line', async () => {
    await setup('light');
    expect(screen.getByTestId('theme-light').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('theme-dark').props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId('lang-en').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('settings-haptics').props.value).toBe(true);
    expect(screen.getByTestId('settings-about')).toBeTruthy();
    expect(screen.getByText('Floodlight')).toBeTruthy();
  });

  it('choosing Day calls setScheme(light) and persists', async () => {
    const { setScheme, saved } = await setup('dark');
    await fireEvent.press(screen.getByTestId('theme-light'));
    expect(setScheme).toHaveBeenCalledWith('light');
    await act(async () => {});
    expect(saved().scheme).toBe('light');
  });

  it('choosing Hinglish sets the language and persists', async () => {
    const { saved } = await setup();
    await fireEvent.press(screen.getByTestId('lang-hi'));
    expect(getLang()).toBe('hi');
    await act(async () => {});
    expect(saved().lang).toBe('hi');
  });

  it('toggling haptics off persists', async () => {
    const { store, saved } = await setup();
    await fireEvent(screen.getByTestId('settings-haptics'), 'valueChange', false);
    await act(async () => {});
    expect(store.get().haptics).toBe(false);
    expect(saved().haptics).toBe(false);
  });
});
