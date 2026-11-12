import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeProvider';
import type { Theme } from './tokens';

export function useThemeControls(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeControls().theme;
}
