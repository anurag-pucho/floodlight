import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { buildTheme, type Scheme, type Theme } from './tokens';

export interface ThemeContextValue {
  theme: Theme;
  scheme: Scheme;
  setScheme: (scheme: Scheme) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialScheme = 'dark',
}: {
  children: ReactNode;
  initialScheme?: Scheme;
}) {
  const [scheme, setScheme] = useState<Scheme>(initialScheme);
  const toggle = useCallback(() => setScheme((s) => (s === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo<ThemeContextValue>(
    () => ({ theme: buildTheme(scheme), scheme, setScheme, toggle }),
    [scheme, toggle],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
