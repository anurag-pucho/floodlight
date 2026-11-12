import { useCallback } from 'react';
import { useT } from '../../i18n/useT';
import { scorecardCopy, type ScorecardCopy } from './copy';

export function useScorecardT() {
  const { lang } = useT();
  return useCallback(
    (key: keyof ScorecardCopy, vars?: Record<string, string | number>) =>
      scorecardCopy(lang, key, vars),
    [lang],
  );
}
