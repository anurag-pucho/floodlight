import { themes, spacing, radii, typography, fontFamily, elevation } from '../../src/theme/tokens';

const REQUIRED_COLORS = [
  'bg', 'bgElevated', 'surface', 'surfaceAlt', 'hairline',
  'primary', 'onPrimary', 'secondary', 'gold',
  'textPrimary', 'textSecondary', 'textMuted',
  'dot', 'run', 'four', 'six', 'wicket', 'extra',
] as const;

describe('tokens', () => {
  for (const scheme of ['dark', 'light'] as const) {
    it(`${scheme} defines every required color`, () => {
      for (const key of REQUIRED_COLORS) {
        expect(typeof themes[scheme].colors[key]).toBe('string');
        expect(themes[scheme].colors[key].length).toBeGreaterThan(0);
      }
      expect(themes[scheme].gradient.pitch).toHaveLength(2);
    });
  }

  it('dark and light define identical color keys', () => {
    expect(Object.keys(themes.dark.colors).sort()).toEqual(Object.keys(themes.light.colors).sort());
  });

  it('dark uses the exact brand values', () => {
    expect(themes.dark.colors.bg).toBe('#0B0F0E');
    expect(themes.dark.colors.primary).toBe('#B8FF3B');
    expect(themes.dark.colors.four).toBe('#38B6FF');
  });

  it('spacing and radii have expected keys', () => {
    expect(Object.keys(spacing)).toEqual(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']);
    expect(Object.keys(radii)).toEqual(['sm', 'md', 'lg', 'xl', 'pill']);
  });

  it('typography has expected styles and fonts', () => {
    for (const k of ['display', 'h1', 'h2', 'body', 'label', 'caption', 'score'] as const) {
      expect(typography[k].fontSize).toBeGreaterThan(0);
    }
    expect(Object.keys(fontFamily)).toEqual(['display', 'heading', 'body', 'label', 'numeric']);
    expect(typography.display.lineHeight).toBe(44);
  });

  it('elevation presets exist', () => {
    expect(Object.keys(elevation)).toEqual(expect.arrayContaining(['low', 'medium', 'high']));
  });
});
