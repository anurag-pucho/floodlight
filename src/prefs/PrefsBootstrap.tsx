import { useEffect } from 'react';
import { useThemeControls } from '../theme/useTheme';
import { setLang } from '../i18n/useT';
import { hydratePrefs } from './prefs';

/** Renders nothing; on mount loads saved prefs and applies theme + language. */
export function PrefsBootstrap() {
  const { setScheme } = useThemeControls();
  useEffect(() => {
    let alive = true;
    void hydratePrefs().then((prefs) => {
      if (!alive) return;
      setScheme(prefs.scheme);
      setLang(prefs.lang);
    });
    return () => {
      alive = false;
    };
  }, [setScheme]);
  return null;
}
