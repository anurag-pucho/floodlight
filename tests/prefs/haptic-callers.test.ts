// The project has no @types/node; load the two Node helpers through a typed require.
declare const require: (id: string) => unknown;
declare const __dirname: string;
const { readFileSync } = require('fs') as { readFileSync: (p: string, enc: 'utf8') => string };
const { join } = require('path') as { join: (...p: string[]) => string };

const root = join(__dirname, '..', '..');
const callers = [
  'src/components/TapButton.tsx',
  'src/components/ScreenHeader.tsx',
  'src/features/scoring/useScoring.ts',
  'src/features/scoring/MilestoneCelebration.tsx',
  'src/features/setup/TossFlip.tsx',
  'src/features/scorecard/Replay.tsx',
];

describe('haptic callers honor the pref', () => {
  it.each(callers)('%s routes through haptic() and not expo-haptics', (file) => {
    const src = readFileSync(join(root, file), 'utf8');
    expect(src).not.toMatch(/expo-haptics/);
    expect(src).toMatch(/prefs\/haptic/);
  });
});
