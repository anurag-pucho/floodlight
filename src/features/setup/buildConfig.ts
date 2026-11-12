import { randomUUID } from 'expo-crypto';
import type { MatchConfig, MatchRules, Player, SquadPlayer, TeamConfig } from '../../engine';

export type Side = 'A' | 'B';

export interface TeamInput {
  name: string;
  color: string;
  /** Player names exclusive to this team (shared players are listed separately). */
  players: string[];
  /** Name of the captain (one of this team's own or shared players). One at most, by construction. */
  captain?: string;
  /** Name of the wicketkeeper (one of this team's own or shared players). One at most, by construction. */
  wicketkeeper?: string;
}

export interface RulesInput {
  overs: number;
  wideRuns: number;
  noBallRuns: number;
  freeHitOnNoBall: boolean;
  lastManStands: boolean;
  byesEnabled: boolean;
  /** 0 or undefined means no per-bowler limit. */
  maxOversPerBowler?: number;
}

export interface TossInput {
  winner: Side;
  choice: 'bat' | 'bowl';
}

export interface SetupInput {
  teamA: TeamInput;
  teamB: TeamInput;
  /** Union players: appear in both squads with the same playerId. */
  shared: string[];
  rules: RulesInput;
  toss: TossInput;
}

export type SetupErrorCode =
  'teamNameEmpty' | 'duplicatePlayer' | 'squadTooSmall' | 'oversInvalid' | 'roleNotInSquad';

export interface SetupErrors {
  teamA: SetupErrorCode[];
  teamB: SetupErrorCode[];
  shared: SetupErrorCode[];
  rules: SetupErrorCode[];
}

const clean = (names: string[]): string[] => names.map((n) => n.trim()).filter((n) => n.length > 0);
const key = (n: string): string => n.trim().toLowerCase();

/** Case/space-insensitive identity of a player name (used to match C/WK marks). */
export const nameKey = key;

function hasDuplicates(names: string[]): boolean {
  const seen = new Set<string>();
  for (const n of names) {
    const k = key(n);
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

function teamErrors(team: TeamInput, shared: string[]): SetupErrorCode[] {
  const out: SetupErrorCode[] = [];
  if (team.name.trim().length === 0) out.push('teamNameEmpty');
  const names = [...clean(shared), ...clean(team.players)];
  if (hasDuplicates(names)) out.push('duplicatePlayer');
  if (names.length < 2) out.push('squadTooSmall');
  const inSquad = (n: string | undefined): boolean =>
    n === undefined || n.trim().length === 0 || names.some((m) => key(m) === key(n));
  if (!inSquad(team.captain) || !inSquad(team.wicketkeeper)) out.push('roleNotInSquad');
  return out;
}

/** Pure validation; an all-empty result means the input can be built. */
export function validateSetup(input: SetupInput): SetupErrors {
  const rules: SetupErrorCode[] = [];
  if (!Number.isFinite(input.rules.overs) || input.rules.overs < 1) rules.push('oversInvalid');
  return {
    teamA: teamErrors(input.teamA, input.shared),
    teamB: teamErrors(input.teamB, input.shared),
    shared: hasDuplicates(clean(input.shared)) ? ['duplicatePlayer'] : [],
    rules,
  };
}

export function isValid(errors: SetupErrors): boolean {
  return (
    errors.teamA.length === 0 &&
    errors.teamB.length === 0 &&
    errors.shared.length === 0 &&
    errors.rules.length === 0
  );
}

export function battingFirstFrom(toss: TossInput): Side {
  if (toss.choice === 'bat') return toss.winner;
  return toss.winner === 'A' ? 'B' : 'A';
}

/** Assembles a MatchConfig with fresh ids. Assumes the input passed validateSetup. */
export function buildConfig(input: SetupInput): MatchConfig {
  const players: Record<string, Player> = {};
  const addPlayer = (name: string): string => {
    const id = randomUUID();
    players[id] = { id, name };
    return id;
  };

  const sharedSquad = clean(input.shared).map((name) => ({
    name,
    playerId: addPlayer(name),
  }));

  const buildTeam = (team: TeamInput): TeamConfig => {
    // Only the single named captain / keeper of THIS team gets a flag (shared players are per-team).
    let captainSet = false;
    let keeperSet = false;
    const squadPlayer = (name: string, playerId: string, isShared: boolean): SquadPlayer => {
      const isCaptain = !captainSet && !!team.captain && key(team.captain) === key(name);
      const isWicketkeeper = !keeperSet && !!team.wicketkeeper && key(team.wicketkeeper) === key(name);
      if (isCaptain) captainSet = true;
      if (isWicketkeeper) keeperSet = true;
      return {
        playerId,
        isShared,
        ...(isCaptain ? { isCaptain: true } : {}),
        ...(isWicketkeeper ? { isWicketkeeper: true } : {}),
      };
    };
    const shared = sharedSquad.map((p) => squadPlayer(p.name, p.playerId, true));
    const own = clean(team.players).map((n) => squadPlayer(n, addPlayer(n), false));
    return {
      id: randomUUID(),
      name: team.name.trim(),
      color: team.color,
      players: [...shared, ...own],
    };
  };

  const teamA = buildTeam(input.teamA);
  const teamB = buildTeam(input.teamB);

  const r = input.rules;
  const rules: MatchRules = {
    oversPerInnings: r.overs,
    wideRuns: r.wideRuns,
    noBallRuns: r.noBallRuns,
    freeHitOnNoBall: r.freeHitOnNoBall,
    lastManStands: r.lastManStands,
    byesEnabled: r.byesEnabled,
    ...(r.maxOversPerBowler && r.maxOversPerBowler > 0 ? { maxOversPerBowler: r.maxOversPerBowler } : {}),
  };

  return {
    id: randomUUID(),
    teamA,
    teamB,
    players,
    rules,
    battingFirst: battingFirstFrom(input.toss),
  };
}

/** Prefills squads (names, shared flags, C/WK) from a saved match config. */
export function prefillFromConfig(config: MatchConfig): {
  teamA: TeamInput;
  teamB: TeamInput;
  shared: string[];
} {
  const nameOf = (p: SquadPlayer): string => config.players[p.playerId]?.name ?? '';
  const shared = config.teamA.players.filter((p) => p.isShared).map(nameOf);
  const toInput = (team: TeamConfig): TeamInput => {
    const cap = team.players.find((p) => p.isCaptain);
    const wk = team.players.find((p) => p.isWicketkeeper);
    return {
      name: team.name,
      color: team.color,
      players: team.players.filter((p) => !p.isShared).map(nameOf),
      ...(cap ? { captain: nameOf(cap) } : {}),
      ...(wk ? { wicketkeeper: nameOf(wk) } : {}),
    };
  };
  return { teamA: toInput(config.teamA), teamB: toInput(config.teamB), shared };
}
