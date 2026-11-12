import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/theme/useTheme';
import { useT } from '../src/i18n/useT';

export default function Index() {
  const { colors, gradient, spacing, radii, typography } = useTheme();
  const { t, lang, setLang } = useT();
  const chip = (bg: string) => ({
    backgroundColor: bg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  });
  return (
    <LinearGradient
      colors={[...gradient.pitch]}
      style={{ flex: 1, padding: spacing['2xl'], justifyContent: 'center' }}
    >
      <Text style={[typography.label, { color: colors.primary, letterSpacing: 2 }]}>
        {t('appName').toUpperCase()}
      </Text>
      <Text style={[typography.score, { color: colors.textPrimary, marginTop: spacing.sm }]}>
        186/4
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
        {t('tagline')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing['3xl'] }}>
        <View style={chip(colors.four)}>
          <Text style={[typography.label, { color: colors.bg }]}>{t('four')}</Text>
        </View>
        <View style={chip(colors.six)}>
          <Text style={[typography.label, { color: colors.bg }]}>{t('six')}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}
        style={{
          marginTop: spacing['3xl'],
          backgroundColor: colors.primary,
          borderRadius: radii.lg,
          paddingVertical: spacing.lg,
          alignItems: 'center',
        }}
      >
        <Text style={[typography.h2, { color: colors.onPrimary }]}>{t('newMatch')}</Text>
      </Pressable>
    </LinearGradient>
  );
}
