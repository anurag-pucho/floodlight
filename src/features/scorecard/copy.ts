import { format, type Lang } from '../../i18n/strings';

/** Scorecard-only copy; cricket column abbreviations are kept short on purpose. */
export interface ScorecardCopy {
  title: string;
  noMatch: string;
  inningsN: string;
  batter: string;
  bowlerCol: string;
  colR: string;
  colB: string;
  colFours: string;
  colSixes: string;
  colSR: string;
  colO: string;
  colM: string;
  colW: string;
  colEcon: string;
  colDots: string;
  colWd: string;
  colNb: string;
  notOut: string;
  captainTag: string;
  keeperTag: string;
  extrasDetail: string;
  fallOfWickets: string;
  fowEntry: string;
  partnerships: string;
  partnershipEntry: string;
  targetLine: string;
  needOff: string;
  requiredRate: string;
  currentRate: string;
  wonByLine: string;
  chartsTitle: string;
  manhattanTitle: string;
  wormTitle: string;
  runRateTitle: string;
  noChartData: string;
  chaseProgress: string;
  replayTitle: string;
  replayShow: string;
  replayHide: string;
  replayPlay: string;
  replayPause: string;
  replayPrev: string;
  replayNext: string;
  replayPosition: string;
  replayScrubA11y: string;
  replayBall: string;
  replayDot: string;
  replayRuns: string;
  replayFour: string;
  replaySix: string;
  replayWicket: string;
  replayWide: string;
  replayNoBall: string;
  replayBye: string;
  replayLegBye: string;
  replayEmpty: string;
}

const en: ScorecardCopy = {
  title: 'Scorecard',
  noMatch: 'No match loaded',
  inningsN: 'Innings {n}',
  batter: 'Batter',
  bowlerCol: 'Bowler',
  colR: 'R',
  colB: 'B',
  colFours: '4s',
  colSixes: '6s',
  colSR: 'SR',
  colO: 'O',
  colM: 'M',
  colW: 'W',
  colEcon: 'Econ',
  colDots: '0s',
  colWd: 'Wd',
  colNb: 'Nb',
  notOut: 'not out',
  captainTag: '(C)',
  keeperTag: '(WK)',
  extrasDetail: 'b {b}, lb {lb}, w {w}, nb {nb}',
  fallOfWickets: 'Fall of wickets',
  fowEntry: '{no}-{score} ({name}, {over} ov)',
  partnerships: 'Partnerships',
  partnershipEntry: '{a} & {b}',
  targetLine: 'Target {n}',
  needOff: 'Need {runs} off {balls}',
  requiredRate: 'RRR {rate}',
  currentRate: 'CRR {rate}',
  wonByLine: '{team} won {margin}',
  chartsTitle: 'Analysis',
  manhattanTitle: 'Manhattan - runs per over',
  wormTitle: 'Worm - cumulative runs',
  runRateTitle: 'Run rate',
  noChartData: 'No balls bowled yet',
  chaseProgress: '{runs} of {target}',
  replayTitle: 'Replay',
  replayShow: 'Show',
  replayHide: 'Hide',
  replayPlay: 'Play',
  replayPause: 'Pause',
  replayPrev: 'Prev',
  replayNext: 'Next',
  replayPosition: '{k} / {n}',
  replayScrubA11y: 'Replay position',
  replayBall: '{over} - {what}',
  replayDot: 'DOT',
  replayRuns: '{n} RUN',
  replayFour: 'FOUR',
  replaySix: 'SIX',
  replayWicket: 'WICKET',
  replayWide: 'WIDE +{n}',
  replayNoBall: 'NO BALL +{n}',
  replayBye: 'BYE +{n}',
  replayLegBye: 'LEG BYE +{n}',
  replayEmpty: 'Before the first ball',
};

const hi: Partial<ScorecardCopy> = {
  noMatch: 'Koi match load nahi hai',
  fallOfWickets: 'Wicket ka girna',
  partnerships: 'Saajhedaari',
  needOff: 'Chahiye {runs}, {balls} ball mein',
  chartsTitle: 'Vishleshan',
  replayTitle: 'Replay (dobara dekho)',
  replayShow: 'Dikhao',
  replayHide: 'Chhupao',
  replayPlay: 'Chalao',
  replayPause: 'Roko',
  replayPrev: 'Pichla',
  replayNext: 'Agla',
  replayScrubA11y: 'Replay ki jagah',
  replayWicket: 'WICKET!',
  replayEmpty: 'Pehli ball se pehle',
};

export function scorecardCopy(
  lang: Lang,
  key: keyof ScorecardCopy,
  vars?: Record<string, string | number>,
): string {
  const raw = (lang === 'hi' ? hi[key] : undefined) ?? en[key];
  return vars ? format(raw, vars) : raw;
}
