import { useCallback } from 'react';
import { useT } from '../../i18n/useT';
import type { Lang } from '../../i18n/strings';

const en = {
  title: 'New Match',
  stepTeamA: 'Team A',
  stepTeamB: 'Team B',
  stepShared: 'Shared players',
  stepRules: 'Overs and rules',
  stepToss: 'Toss',
  teamName: 'Team name',
  teamColor: 'Team color',
  playerName: 'Player name',
  addPlayer: 'Add player',
  removePlayer: 'Remove',
  squadCount: 'Squad',
  sharedHint: 'Shared players appear in both squads.',
  oversLabel: 'Overs per innings',
  wideRuns: 'Runs for a wide',
  noBallRuns: 'Runs for a no-ball',
  maxOvers: 'Max overs per bowler (0 = no limit)',
  freeHit: 'Free hit on no-ball',
  lastMan: 'Last man stands',
  byes: 'Byes enabled',
  next: 'Next',
  back: 'Back',
  startMatch: 'Start match',
  flip: 'Flip the coin',
  tossWinner: 'Who won the toss?',
  tossChoice: 'Chose to',
  bat: 'Bat',
  bowl: 'Bowl',
  errTeamName: 'Enter a team name.',
  errDuplicate: 'Player names must be unique within a squad.',
  errSquad: 'A squad needs at least 2 players.',
  errOvers: 'Overs must be at least 1.',
  wonToss: 'won the toss',
  errRole: 'Captain and wicketkeeper must be players in this squad.',
  captainChip: 'C',
  keeperChip: 'WK',
  captainLabel: 'Captain',
  keeperLabel: 'Wicketkeeper',
  rolesHint: 'Tap C for captain and WK for wicketkeeper. One of each per team.',
  sharedPlayers: 'Shared players',
  usePrevious: 'Use teams from a previous match',
  previousTitle: 'Pick a previous match',
  noPrevious: 'No saved matches yet.',
  loadingPrevious: 'Loading matches...',
  loadedPrevious: 'Teams loaded. Tweak anything, then continue.',
  closePicker: 'Cancel',
  vs: 'vs',
  overs: 'overs',
  coinHint: 'Heads is the first team, tails is the second.',
  heads: 'Heads',
  tails: 'Tails',
  flipAgain: 'Flip again',
  tossBatOrBowl: 'Bat or bowl?',
  battingFirst: 'bats first',
  moveTo: 'Move to',
  previousPlayers: 'Previous players',
} as const;

export type SetupStrings = typeof en;
const tables: Record<Lang, Partial<SetupStrings>> = { en, hi: {} };

export function useSetupT(): (key: keyof SetupStrings) => string {
  const { lang } = useT();
  return useCallback((key) => tables[lang][key] ?? en[key], [lang]);
}
