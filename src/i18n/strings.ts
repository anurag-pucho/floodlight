export type Lang = 'en' | 'hi';

export interface Strings {
  appName: string;
  tagline: string;
  newMatch: string;
  resume: string;
  history: string;
  settings: string;
  start: string;
  save: string;
  cancel: string;
  undo: string;
  redo: string;
  confirm: string;
  teamA: string;
  teamB: string;
  players: string;
  overs: string;
  over: string;
  toss: string;
  batting: string;
  bowling: string;
  striker: string;
  nonStriker: string;
  bowler: string;
  runs: string;
  dot: string;
  one: string;
  two: string;
  three: string;
  four: string;
  six: string;
  out: string;
  wicket: string;
  wide: string;
  noBall: string;
  bye: string;
  legBye: string;
  extras: string;
  target: string;
  need: string;
  required: string;
  runRate: string;
  partnership: string;
  innings: string;
  endInnings: string;
  matchResult: string;
  wonBy: string;
  tied: string;
  language: string;
  theme: string;
  dark: string;
  light: string;
}

export const en: Strings = {
  appName: 'Floodlight',
  tagline: 'Score every ball under the lights',
  newMatch: 'New Match',
  resume: 'Resume',
  history: 'History',
  settings: 'Settings',
  start: 'Start',
  save: 'Save',
  cancel: 'Cancel',
  undo: 'Undo',
  redo: 'Redo',
  confirm: 'Confirm',
  teamA: 'Team A',
  teamB: 'Team B',
  players: 'Players',
  overs: 'Overs',
  over: 'Over',
  toss: 'Toss',
  batting: 'Batting',
  bowling: 'Bowling',
  striker: 'Striker',
  nonStriker: 'Non-striker',
  bowler: 'Bowler',
  runs: 'Runs',
  dot: 'Dot',
  one: 'One',
  two: 'Two',
  three: 'Three',
  four: 'Four',
  six: 'Six',
  out: 'Out',
  wicket: 'Wicket',
  wide: 'Wide',
  noBall: 'No Ball',
  bye: 'Bye',
  legBye: 'Leg Bye',
  extras: 'Extras',
  target: 'Target',
  need: 'Need',
  required: 'Required',
  runRate: 'Run Rate',
  partnership: 'Partnership',
  innings: 'Innings',
  endInnings: 'End Innings',
  matchResult: 'Result',
  wonBy: 'Won by',
  tied: 'Tied',
  language: 'Language',
  theme: 'Theme',
  dark: 'Night',
  light: 'Day',
};

/** Hinglish (Latin script). Any missing key falls back to `en`. */
export const hi: Partial<Strings> = {
  tagline: 'Har ball ka score, floodlights ke neeche',
  newMatch: 'Naya Match',
  resume: 'Jaari Rakho',
  history: 'Purane Match',
  start: 'Shuru Karo',
  save: 'Save Karo',
  cancel: 'Radd Karo',
  undo: 'Wapas',
  redo: 'Phir Se',
  confirm: 'Pakka Karo',
  players: 'Khiladi',
  bowler: 'Gendbaaz',
  runs: 'Run',
  dot: 'Dot Ball',
  one: 'Ek',
  two: 'Do',
  three: 'Teen',
  four: 'Chauka',
  six: 'Chhakka',
  out: 'Out',
  wide: 'Wide',
  noBall: 'No Ball',
  bye: 'Bye',
  legBye: 'Leg Bye',
  need: 'Chahiye',
  required: 'Zaroori',
  partnership: 'Saajhedaari',
  endInnings: 'Innings Khatam',
  matchResult: 'Nateeja',
  wonBy: 'Jeet',
  tied: 'Barabar',
  language: 'Bhasha',
  dark: 'Raat',
  light: 'Din',
};

export const tables: Record<Lang, Partial<Strings>> = { en, hi };

export function translate(
  lang: Lang,
  key: keyof Strings,
  table: Partial<Strings> = tables[lang],
): string {
  return table[key] ?? en[key];
}
