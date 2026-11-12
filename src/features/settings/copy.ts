import { getLang } from '../../i18n/useT';
import type { Lang } from '../../i18n/strings';

/** Settings-feature strings not in the shared catalogue; Hinglish falls back to English. */
const en = {
  subtitle: 'Make Floodlight yours',
  english: 'English',
  hinglish: 'Hinglish',
  haptics: 'Haptics',
  hapticsHint: 'Feel a tap on every button press',
  about: 'About',
} as const;

export type SettingsCopyKey = keyof typeof en;

const hi: Partial<Record<SettingsCopyKey, string>> = {
  subtitle: 'Floodlight ko apna banao',
  hapticsHint: 'Har button dabane par halka kampan',
  about: 'Baare mein',
};

export function settingsCopy(key: SettingsCopyKey, lang: Lang = getLang()): string {
  return (lang === 'hi' ? hi[key] : undefined) ?? en[key];
}
