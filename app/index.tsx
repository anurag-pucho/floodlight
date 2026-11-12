import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../src/theme/useTheme';
import { useT } from '../src/i18n/useT';
import { Screen } from '../src/components/Screen';
import { Surface } from '../src/components/Surface';
import { Text } from '../src/components/Text';
import { TapButton } from '../src/components/TapButton';
import { CricketBall } from '../src/components/CricketBall';
import { OverOrbs, type BallGlyph } from '../src/components/OverOrbs';
import { Scoreboard } from '../src/components/Scoreboard';

const SEQUENCE: BallGlyph[] = [
  { kind: 'run', label: '1' },
  { kind: 'dot' },
  { kind: 'four' },
  { kind: 'six' },
  { kind: 'wicket' },
  { kind: 'extra', label: 'Wd' },
];

export default function Index() {
  const { spacing } = useTheme();
  const { t, lang, setLang } = useT();
  const [runs, setRuns] = useState(186);
  const [wickets, setWickets] = useState(4);
  const [balls, setBalls] = useState<BallGlyph[]>(SEQUENCE.slice(0, 3));

  const bowl = () => {
    const next = SEQUENCE[balls.length % SEQUENCE.length] as BallGlyph;
    const add = next.kind === 'four' ? 4 : next.kind === 'six' ? 6 : next.kind === 'run' ? 1 : next.kind === 'extra' ? 1 : 0;
    setRuns((r) => r + add);
    if (next.kind === 'wicket') setWickets((w) => Math.min(10, w + 1));
    setBalls((b) => (b.length >= 6 ? [next] : [...b, next]));
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.xl, paddingVertical: spacing.lg }}>
        <Text variant="label" color="primary" style={{ letterSpacing: 2 }}>
          {t('appName').toUpperCase()}
        </Text>
        <Text variant="body" color="textSecondary">
          {t('tagline')}
        </Text>

        <Surface gradient elevation="medium">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Scoreboard runs={runs} wickets={wickets} overs={`${Math.floor(balls.length / 6) + 18}.${balls.length % 6}`} />
            <CricketBall size={72} />
          </View>
        </Surface>

        <Surface>
          <OverOrbs balls={balls} />
        </Surface>

        <TapButton label={t('newMatch')} onPress={bowl} haptic="medium" />
        <TapButton
          variant="secondary"
          label={lang === 'en' ? 'हिन्दी' : 'English'}
          onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}
        />
      </ScrollView>
    </Screen>
  );
}
