import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/useTheme';
import { useT } from '../src/i18n/useT';
import { Screen } from '../src/components/Screen';
import { Surface } from '../src/components/Surface';
import { Text } from '../src/components/Text';
import { TapButton } from '../src/components/TapButton';
import { HomeHero } from '../src/features/home/HomeHero';
import { homeCopy } from '../src/features/home/copy';
import { statsCopy } from '../src/features/stats/copy';
import { matchStore } from '../src/store/matchStore';

export interface HomeScreenProps {
  /** Loads a resumable match into the store; resolves true when one exists. Injectable for tests. */
  checkResumable?: () => Promise<boolean>;
}

const defaultCheck = (): Promise<boolean> => matchStore.getState().resume();

export function HomeScreen({ checkResumable = defaultCheck }: HomeScreenProps) {
  const router = useRouter();
  const { spacing } = useTheme();
  const { t, lang } = useT();
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    let alive = true;
    checkResumable()
      .then((found) => {
        if (alive) setCanResume(found);
      })
      .catch(() => {
        if (alive) setCanResume(false);
      });
    return () => {
      alive = false;
    };
  }, [checkResumable]);

  return (
    <Screen style={{ gap: spacing.xl }}>
      <HomeHero />
      {canResume ? (
        <Surface elevation="medium" testID="resume-card">
          <Text variant="heading">{t('resume')}</Text>
          <Text variant="body" color="textSecondary" style={{ marginBottom: spacing.md }}>
            {homeCopy('resumeSub', lang)}
          </Text>
          <TapButton label={t('resume')} onPress={() => router.push('/match/score')} haptic="medium" />
        </Surface>
      ) : null}
      <TapButton label={t('newMatch')} onPress={() => router.push('/match/setup')} haptic="medium" />
      <TapButton variant="secondary" label={homeCopy('matches', lang)} onPress={() => router.push('/matches')} />
      <TapButton variant="secondary" label={statsCopy('stats', lang)} onPress={() => router.push('/stats')} />
    </Screen>
  );
}

export default function Index() {
  return <HomeScreen />;
}
