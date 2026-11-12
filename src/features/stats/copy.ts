import { getLang } from '../../i18n/useT';
import type { Lang } from '../../i18n/strings';

/** Stats-feature strings not in the shared catalogue; Hinglish falls back to English. */
const en = {
  title: 'Career stats',
  subtitle: 'Every completed match, added up',
  stats: 'Stats',
  loading: 'Loading stats',
  emptyTitle: 'No stats yet',
  emptyBody: 'Finish a match and every run and wicket lands here, ready to compare.',
  mostRuns: 'Most runs',
  mostWickets: 'Most wickets',
  players: 'Players',
  searchPlayers: 'Search players',
  noPlayerMatch: 'No player matches that search',
  noneYet: 'Nobody yet',
  headToHead: 'Head to head',
  played: 'Played',
  won: 'Won',
  tied: 'Tied',
  batting: 'Batting',
  bowling: 'Bowling',
  matches: 'Matches',
  innings: 'Innings',
  notOuts: 'Not outs',
  runs: 'Runs',
  balls: 'Balls',
  highScore: 'High score',
  fifties: '50s',
  hundreds: '100s',
  strikeRate: 'Strike rate',
  wickets: 'Wickets',
  best: 'Best',
  overs: 'Overs',
  conceded: 'Runs conceded',
  economy: 'Economy',
  catches: 'Catches',
  close: 'Close',
  runsShort: '{n} runs',
  wicketsShort: '{n} wkts',
  matchesShort: '{n} matches',
} as const;

export type StatsCopyKey = keyof typeof en;

const hi: Partial<Record<StatsCopyKey, string>> = {
  title: 'Career stats',
  subtitle: 'Har poora hua match, jodkar',
  emptyTitle: 'Abhi koi stats nahi',
  emptyBody: 'Ek match khatam karo, har run aur wicket yahin dikhega.',
  mostRuns: 'Sabse zyada run',
  mostWickets: 'Sabse zyada wicket',
  players: 'Khiladi',
  searchPlayers: 'Khiladi dhundho',
  headToHead: 'Aamne-saamne',
};

export function statsCopy(key: StatsCopyKey, lang: Lang = getLang()): string {
  return (lang === 'hi' ? hi[key] : undefined) ?? en[key];
}
