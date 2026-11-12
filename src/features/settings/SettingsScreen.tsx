import { Switch, View } from 'react-native';
import { useTheme, useThemeControls } from '../../theme/useTheme';
import { useT } from '../../i18n/useT';
import type { Lang } from '../../i18n/strings';
import type { Scheme } from '../../theme/tokens';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Surface } from '../../components/Surface';
import { Text } from '../../components/Text';
import { prefsStore, usePrefs, type PrefsStore } from '../../prefs/prefs';
import { SegmentedControl } from './SegmentedControl';
import { settingsCopy } from './copy';

export interface SettingsScreenProps {
  /** Injectable for tests; defaults to the app-wide persisted store. */
  store?: PrefsStore;
}

export function SettingsScreen({ store = prefsStore }: SettingsScreenProps) {
  const { spacing, colors } = useTheme();
  const { scheme, setScheme } = useThemeControls();
  const { t, lang, setLang } = useT();
  const prefs = usePrefs(store);

  const changeScheme = (next: Scheme) => {
    setScheme(next);
    void store.set({ scheme: next });
  };
  const changeLang = (next: Lang) => {
    setLang(next);
    void store.set({ lang: next });
  };
  const changeHaptics = (next: boolean) => {
    void store.set({ haptics: next });
  };

  return (
    <Screen header={<ScreenHeader showHome />} style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="display">{t('settings')}</Text>
        <Text variant="body" color="textSecondary">
          {settingsCopy('subtitle', lang)}
        </Text>
      </View>

      <Surface style={{ gap: spacing.md }}>
        <Text variant="heading">{t('theme')}</Text>
        <SegmentedControl<Scheme>
          testID="settings-theme"
          label={t('theme')}
          value={scheme}
          onChange={changeScheme}
          segments={[
            { value: 'dark', label: t('dark'), testID: 'theme-dark' },
            { value: 'light', label: t('light'), testID: 'theme-light' },
          ]}
        />
      </Surface>

      <Surface style={{ gap: spacing.md }}>
        <Text variant="heading">{t('language')}</Text>
        <SegmentedControl<Lang>
          testID="settings-language"
          label={t('language')}
          value={lang}
          onChange={changeLang}
          segments={[
            { value: 'en', label: settingsCopy('english', lang), testID: 'lang-en' },
            { value: 'hi', label: settingsCopy('hinglish', lang), testID: 'lang-hi' },
          ]}
        />
      </Surface>

      <Surface>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="heading">{settingsCopy('haptics', lang)}</Text>
            <Text variant="caption" color="textSecondary">
              {settingsCopy('hapticsHint', lang)}
            </Text>
          </View>
          <Switch
            testID="settings-haptics"
            accessibilityLabel={settingsCopy('haptics', lang)}
            value={prefs.haptics}
            onValueChange={changeHaptics}
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </Surface>

      <Surface testID="settings-about" style={{ gap: spacing.xs }}>
        <Text variant="heading">{settingsCopy('about', lang)}</Text>
        <Text variant="label">{t('appName')}</Text>
        <Text variant="body" color="textSecondary">
          {t('tagline')}
        </Text>
      </Surface>
    </Screen>
  );
}
