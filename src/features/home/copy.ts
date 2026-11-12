import { getLang } from '../../i18n/useT';
import type { Lang } from '../../i18n/strings';

/** Home-feature strings not (yet) in the shared catalogue; Hinglish falls back to English. */
const en = {
  matches: 'Matches',
  matchesSub: 'Every game, saved on this phone',
  resumeSub: 'Pick up where you left off',
  inProgress: 'In progress',
  complete: 'Complete',
  emptyTitle: 'The pitch is empty',
  emptyBody: 'Start your first match and it will be kept here, even without a signal.',
  loading: 'Loading matches',
  wonResult: '{team} won {margin}',
  vs: 'vs',
  rematch: 'Rematch',
  searchPlaceholder: 'Search teams or players',
  filterAll: 'All',
  sortNewest: 'Newest',
  sortOldest: 'Oldest',
  noResultsTitle: 'No matches match your search',
  noResultsBody: 'Try a different name or clear the filters.',
  clearFilters: 'Clear filters',
} as const;

export type HomeCopyKey = keyof typeof en;

const hi: Partial<Record<HomeCopyKey, string>> = {
  matches: 'Match',
  matchesSub: 'Har game, is phone mein save',
  resumeSub: 'Jahan chhoda tha wahin se',
  inProgress: 'Chal raha hai',
  complete: 'Khatam',
  emptyTitle: 'Pitch khaali hai',
  emptyBody: 'Pehla match shuru karo, signal na ho tab bhi yahin save rahega.',
  wonResult: '{team} ne jeeta {margin}',
  searchPlaceholder: 'Team ya player dhoondo',
  filterAll: 'Sab',
  sortNewest: 'Naya pehle',
  sortOldest: 'Purana pehle',
  noResultsTitle: 'Koi match nahi mila',
  noResultsBody: 'Doosra naam try karo ya filter hata do.',
  clearFilters: 'Filter hatao',
};

export function homeCopy(key: HomeCopyKey, lang: Lang = getLang()): string {
  return (lang === 'hi' ? hi[key] : undefined) ?? en[key];
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}
