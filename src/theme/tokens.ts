export type Scheme = 'dark' | 'light';

export interface Colors {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  hairline: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  gold: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  dot: string;
  run: string;
  four: string;
  six: string;
  wicket: string;
  extra: string;
}

export interface ThemeTokens {
  colors: Colors;
  gradient: { pitch: readonly [string, string] };
}

export const themes: Record<Scheme, ThemeTokens> = {
  dark: {
    colors: {
      bg: '#0B0F0E',
      bgElevated: '#121917',
      surface: '#16201C',
      surfaceAlt: '#1E2A25',
      hairline: 'rgba(255,255,255,0.08)',
      primary: '#B8FF3B',
      onPrimary: '#0B0F0E',
      secondary: '#FF5A3C',
      gold: '#FFC53D',
      textPrimary: '#F3F6F4',
      textSecondary: '#9DA9A3',
      textMuted: '#67736D',
      dot: '#67736D',
      run: '#C9D6CF',
      four: '#38B6FF',
      six: '#B265FF',
      wicket: '#FF5A3C',
      extra: '#FFBE3D',
    },
    gradient: { pitch: ['#0E1512', '#0B0F0E'] },
  },
  light: {
    colors: {
      bg: '#F7F9F7',
      bgElevated: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#EEF2EF',
      hairline: 'rgba(16,33,27,0.10)',
      primary: '#4F9A00',
      onPrimary: '#FFFFFF',
      secondary: '#E0391B',
      gold: '#B8860B',
      textPrimary: '#10211B',
      textSecondary: '#4A5A53',
      textMuted: '#7B8882',
      dot: '#9AA6A0',
      run: '#3C4A43',
      four: '#0A84C6',
      six: '#8A3FD6',
      wicket: '#E0391B',
      extra: '#C98A00',
    },
    gradient: { pitch: ['#FFFFFF', '#F7F9F7'] },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const fontFamily = {
  display: 'SpaceGrotesk_700Bold',
  heading: 'SpaceGrotesk_600SemiBold',
  body: 'SpaceGrotesk_400Regular',
  label: 'SpaceGrotesk_500Medium',
  numeric: 'SpaceMono_700Bold',
} as const;

export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

export const typography = {
  display: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 44 },
  h1: { fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 32 },
  h2: { fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.label, fontSize: 13, lineHeight: 16 },
  caption: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  score: { fontFamily: fontFamily.numeric, fontSize: 56, lineHeight: 60 },
  numeric: { fontFamily: fontFamily.numeric, fontSize: 20, lineHeight: 24 },
} as const satisfies Record<string, TextStyleToken>;

export const elevation = {
  low: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  high: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  /** Hairline border convention: 1px in colors.hairline. */
  hairlineWidth: 1,
} as const;

export interface Theme {
  scheme: Scheme;
  colors: Colors;
  gradient: ThemeTokens['gradient'];
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  elevation: typeof elevation;
}

export function buildTheme(scheme: Scheme): Theme {
  const t = themes[scheme];
  return {
    scheme,
    colors: t.colors,
    gradient: t.gradient,
    spacing,
    radii,
    typography,
    fontFamily,
    elevation,
  };
}
