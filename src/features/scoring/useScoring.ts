import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { haptic } from '../../prefs/haptic';
import {
  batsmenAtCrease,
  battingCard,
  bowlerOversBowled,
  bowlingSide,
  canSharedPlayerBat,
  canSharedPlayerBowl,
  isSharedPlayer,
  bowlingCard,
  chaseStatus,
  currentInningsIndex,
  dismissedIds,
  isFreeHit,
  lastBallMilestones,
  matchResult,
  target,
  teamTotal,
  teamWicketkeeperId,
  wicketsDown,
} from '../../engine';
import type {
  BallRecord,
  DeliveryInput,
  ExtraType,
  MatchResult,
  MatchState,
  MilestoneKind,
  Player,
  TeamConfig,
  WicketType,
} from '../../engine';
import { matchStore } from '../../store/matchStore';
import { useT } from '../../i18n/useT';
import { format, type Strings } from '../../i18n/strings';
import type { BallGlyph } from '../../components/OverOrbs';

export type ScoringStore = typeof matchStore;

/** Scoring-screen copy that is not (yet) in the shared string table. */
export const scoringStrings = {
  freeHit: 'FREE HIT',
  more: 'More',
  selectOpeners: 'Select openers',
  selectBowler: 'Select bowler',
  newBatter: 'Select new batter',
  startInnings: 'Start innings',
  startSecondInnings: 'Start 2nd innings',
  inningsBreak: 'Innings break',
  inningsTotal: '{team} {runs}/{wickets} ({overs})',
  targetIs: 'Target {runs}',
  needFrom: 'Need {runs} from {balls} balls',
  wicketType: 'How out?',
  outBatter: 'Who is out?',
  fielder: 'Fielder (optional)',
  noFielder: 'None',
  capReached: 'Over cap reached - pick anyway',
  undoLast: 'Undo last ball',
  runsCompleted: 'Runs completed',
  extraType: 'Type',
  plainRuns: 'Runs',
  viewScorecard: 'View scorecard',
  winnerLine: '{team} won by {margin}',
  noMatch: 'No match in progress',
  bowled: 'Bowled',
  caught: 'Caught',
  lbw: 'LBW',
  runout: 'Run out',
  stumped: 'Stumped',
  hitwicket: 'Hit wicket',
  wideShort: 'Wd',
  noBallShort: 'Nb',
  byeShort: 'B',
  legByeShort: 'Lb',
  striker: 'Striker',
  noBowlerShared: 'No bowler available - shared players cannot bowl while at the crease',
  noBatterShared: 'No batter available - every remaining player is out or already batting',
  keeper: 'Keeper',
  scoringTitle: 'Scoring',
  milestoneFifty: 'FIFTY!',
  milestoneCentury: 'HUNDRED!',
  milestoneThreeWkts: '3-FER!',
  milestoneFourWkts: '4-FER!',
  milestoneFiveWkts: '5-FER!',
  milestoneDismiss: 'Tap to dismiss',
  retire: 'Retire',
  retireTitle: 'Retire {name}',
  retireHurt: 'Retire hurt',
  retireOut: 'Retire out',
  changeBowler: 'Change bowler',
} as const;

/** Hinglish overrides for the scoring copy; any missing key falls back to English. */
export const scoringStringsHi: Partial<Record<keyof typeof scoringStrings, string>> = {
  milestoneFifty: 'Fifty!',
  milestoneCentury: 'Century!',
  milestoneThreeWkts: '3 wicket!',
  milestoneFourWkts: '4 wicket!',
  milestoneFiveWkts: '5 wicket!',
  milestoneDismiss: 'Band karne ke liye tap karo',
  retire: 'Retire',
  retireTitle: '{name} retire',
  retireHurt: 'Retire hurt',
  retireOut: 'Retire out',
  changeBowler: 'Gendbaaz badlo',
};

export type ScoringKey = keyof typeof scoringStrings;
export type AnyKey = keyof Strings | ScoringKey;

export const MILESTONE_KEY: Record<MilestoneKind, ScoringKey> = {
  fifty: 'milestoneFifty',
  century: 'milestoneCentury',
  threeWkts: 'milestoneThreeWkts',
  fourWkts: 'milestoneFourWkts',
  fiveWkts: 'milestoneFiveWkts',
};

/** A milestone waiting to be (or being) celebrated. */
export interface PendingMilestone {
  key: string;
  kind: MilestoneKind;
  playerName: string;
}

export function useScoringT(): (key: AnyKey, vars?: Record<string, string | number>) => string {
  const { t, lang } = useT();
  return useCallback(
    (key, vars) => {
      const raw =
        key in scoringStrings
          ? ((lang === 'hi' ? scoringStringsHi[key as ScoringKey] : undefined) ?? scoringStrings[key as ScoringKey])
          : t(key as keyof Strings);
      return vars ? format(raw, vars) : raw;
    },
    [t, lang],
  );
}

export type OutKind = Exclude<WicketType, 'retired'>;

export const WICKET_TYPES: readonly OutKind[] = [
  'bowled',
  'caught',
  'lbw',
  'runout',
  'stumped',
  'hitwicket',
];

/** Mirrors the engine's dismissal rules so the UI only offers legal modes of dismissal. */
export function allowedWickets(freeHit: boolean, extra: ExtraType | null): readonly OutKind[] {
  if (extra === 'wide') return ['runout', 'stumped'];
  if (extra === 'noball') return ['runout'];
  if (freeHit) return ['runout', 'stumped'];
  return WICKET_TYPES;
}

export type DeliveryPart = Pick<DeliveryInput, 'runsBat' | 'extra' | 'wicket'>;

/** Turns "modifier + runs" into the delivery fields (wide/byes carry runs as extra runs). */
export function composeDelivery(extra: ExtraType | null, runs: number, wicket?: DeliveryInput['wicket']): DeliveryPart {
  const base: DeliveryPart = !extra
    ? { runsBat: runs }
    : extra === 'noball'
      ? { runsBat: runs, extra: { type: 'noball', runs: 0 } }
      : { runsBat: 0, extra: { type: extra, runs } };
  return wicket ? { ...base, wicket } : base;
}

export type Phase = 'none' | 'setup' | 'break' | 'live' | 'result';
export type Need = 'batter' | 'bowler' | null;

export interface CreaseLine {
  id: string;
  name: string;
  runs: number;
  balls: number;
}
export interface BowlerLine {
  id: string;
  name: string;
  figures: string;
}

export interface ScoringView {
  phase: Phase;
  need: Need;
  inningsIndex: 0 | 1;
  runs: number;
  wickets: number;
  overs: string;
  freeHit: boolean;
  battingTeam: string;
  chase: { target: number; runsNeeded: number; ballsRemaining: number } | null;
  firstInningsLine: string;
  result: MatchResult;
  winnerName: string;
  striker: CreaseLine | null;
  nonStriker: CreaseLine | null;
  bowler: BowlerLine | null;
  orbs: BallGlyph[];
  batterChoices: Player[];
  bowlerChoices: Player[];
  /** True when the over cap left nobody eligible and the list was relaxed. */
  capHint: boolean;
  fielderChoices: Player[];
  /** Fielding side's wicketkeeper id (auto-filled on a stumping). */
  keeperId: string | undefined;
  /** Ids of players shared between both squads (cannot open AND bowl). */
  sharedIds: string[];
  byesEnabled: boolean;
  /** Players who may replace the bowler mid-over (same over-cap / shared-player filters). */
  changeBowlerChoices: Player[];
  canUndo: boolean;
  canRedo: boolean;
  /** The milestone currently being celebrated (head of the queue), if any. */
  milestone: PendingMilestone | null;
  dismissMilestone(): void;
  submit(part: DeliveryPart): boolean;
  undo(): void;
  redo(): void;
  begin(strikerId: string, nonStrikerId: string, bowlerId: string): void;
  pickBatter(id: string): void;
  pickBowler(id: string): void;
  /** Retire a batter at the crease (hurt = may bat again, out = a wicket); next a new batter is prompted. */
  retire(playerId: string, out: boolean): boolean;
  /** Replace the bowler for the rest of the current (incomplete) over. */
  changeBowler(id: string): void;
}

function oversText(legal: number): string {
  return `${Math.floor(legal / 6)}.${legal % 6}`;
}

function squadPlayers(state: MatchState, team: TeamConfig): Player[] {
  return team.players.map((p) => state.config.players[p.playerId]).filter((p): p is Player => !!p);
}

function sides(state: MatchState, inn: 0 | 1): { bat: TeamConfig; field: TeamConfig } {
  const { teamA, teamB, battingFirst } = state.config;
  const first = battingFirst === 'A' ? teamA : teamB;
  const second = battingFirst === 'A' ? teamB : teamA;
  return inn === 0 ? { bat: first, field: second } : { bat: second, field: first };
}

function glyphFor(e: BallRecord, short: (k: ScoringKey) => string): BallGlyph {
  if (e.wicket) return { kind: 'wicket' };
  if (e.extra) {
    const n = e.extra.type === 'noball' ? e.runsBat : e.extra.runs;
    const base =
      e.extra.type === 'wide'
        ? short('wideShort')
        : e.extra.type === 'noball'
          ? short('noBallShort')
          : e.extra.type === 'bye'
            ? short('byeShort')
            : short('legByeShort');
    return { kind: 'extra', label: n > 0 ? `${base}${n}` : base };
  }
  if (e.runsBat === 0) return { kind: 'dot' };
  if (e.runsBat === 4) return { kind: 'four' };
  if (e.runsBat === 6) return { kind: 'six' };
  return { kind: 'run', label: String(e.runsBat) };
}

interface Picks {
  openers: { inn: 0 | 1; striker: string; non: string } | null;
  bowlerPick: { inn: 0 | 1; id: string } | null;
  batterPick: string | null;
  /** Mid-over bowler replacement; only valid until the next delivery is logged (`at`). */
  bowlerChange: { inn: 0 | 1; at: number; id: string } | null;
}

/** Pure: who is at the crease / bowling and what is still needed, from state plus local picks. */
function resolveLive(state: MatchState, picks: Picks) {
  const { openers, bowlerPick, batterPick, bowlerChange } = picks;
  const inn = currentInningsIndex(state);
  const events = state.events.filter((e) => e.inningsIndex === inn);
  const legal = events.filter((e) => e.legal).length;
  const last = events.length > 0 ? events[events.length - 1] : undefined;
  const result = matchResult(state);
  const crease = batsmenAtCrease(state);
  let strikerId = crease.strikerId;
  let nonId = crease.nonStrikerId;
  if (events.length === 0) {
    if (openers && openers.inn === inn) {
      strikerId = openers.striker;
      nonId = openers.non;
      // Retirements before the first ball act on the scorer-picked openers.
      for (const r of state.retires ?? []) {
        if (r.inningsIndex !== inn) continue;
        if (strikerId === r.playerId) strikerId = '';
        else if (nonId === r.playerId) nonId = '';
      }
    }
  }
  if (batterPick && (events.length > 0 || (openers && openers.inn === inn))) {
    if (!strikerId) strikerId = batterPick;
    else if (!nonId) nonId = batterPick;
  }
  // Current bowler: whoever bowled the last ball of this over, else the pick for the new over.
  const overIndex = Math.floor(legal / 6);
  let bowlerId = '';
  if (last && last.overNumber === overIndex) {
    bowlerId =
      bowlerChange && bowlerChange.inn === inn && bowlerChange.at === state.events.length
        ? bowlerChange.id
        : last.bowlerId;
  }
  else if (bowlerPick && bowlerPick.inn === inn && bowlerPick.id !== last?.bowlerId) bowlerId = bowlerPick.id;
  const awaitingStart =
    events.length === 0 && !(openers && openers.inn === inn && bowlerPick && bowlerPick.inn === inn);
  const phase: Phase = result.decided ? 'result' : awaitingStart ? (inn === 1 ? 'break' : 'setup') : 'live';
  const need: Need = phase !== 'live' ? null : !strikerId || !nonId ? 'batter' : !bowlerId ? 'bowler' : null;
  return { inn, events, legal, last, result, strikerId, nonId, bowlerId, overIndex, phase, need };
}

export function useScoring(store: ScoringStore = matchStore): ScoringView {
  const state = useStore(store, (s) => s.state);
  const sc = useScoringT();
  const [openers, setOpeners] = useState<{ inn: 0 | 1; striker: string; non: string } | null>(null);
  const [bowlerPick, setBowlerPick] = useState<{ inn: 0 | 1; id: string } | null>(null);
  const [batterPick, setBatterPick] = useState<string | null>(null);
  const [bowlerChange, setBowlerChange] = useState<Picks['bowlerChange']>(null);

  const [milestones, setMilestones] = useState<PendingMilestone[]>([]);
  // Keys already celebrated, so undo + re-score or a re-render never repeats a celebration.
  const celebrated = useRef<Set<string>>(new Set());

  const decided = state ? matchResult(state).decided : false;
  useEffect(() => {
    if (decided) store.getState().finishMatch();
  }, [decided, store]);

  const empty: ScoringView = {
    phase: 'none',
    need: null,
    inningsIndex: 0,
    runs: 0,
    wickets: 0,
    overs: '0.0',
    freeHit: false,
    battingTeam: '',
    chase: null,
    firstInningsLine: '',
    result: { decided: false },
    winnerName: '',
    striker: null,
    nonStriker: null,
    bowler: null,
    orbs: [],
    batterChoices: [],
    bowlerChoices: [],
    capHint: false,
    fielderChoices: [],
    keeperId: undefined,
    sharedIds: [],
    byesEnabled: true,
    changeBowlerChoices: [],
    canUndo: false,
    canRedo: false,
    milestone: null,
    dismissMilestone: () => undefined,
    submit: () => false,
    undo: () => undefined,
    redo: () => undefined,
    begin: () => undefined,
    pickBatter: () => undefined,
    pickBowler: () => undefined,
    retire: () => false,
    changeBowler: () => undefined,
  };
  if (!state) return empty;

  const picks: Picks = { openers, bowlerPick, batterPick, bowlerChange };
  const { inn, events, legal, last, result, strikerId, nonId, bowlerId, overIndex, phase, need } = resolveLive(
    state,
    picks,
  );
  const { bat, field } = sides(state, inn);

  const name = (id: string): string => state.config.players[id]?.name ?? id;
  const bat0 = battingCard(state, inn);
  const line = (id: string): CreaseLine | null => {
    if (!id) return null;
    const row = bat0.find((r) => r.playerId === id);
    return { id, name: name(id), runs: row?.runs ?? 0, balls: row?.balls ?? 0 };
  };
  const bowlRow = bowlerId ? bowlingCard(state, inn).find((r) => r.playerId === bowlerId) : undefined;
  const bowler: BowlerLine | null = bowlerId
    ? {
        id: bowlerId,
        name: name(bowlerId),
        figures: bowlRow
          ? `${bowlRow.overs}-${bowlRow.maidens}-${bowlRow.runs}-${bowlRow.wickets}`
          : '0.0-0-0-0',
      }
    : null;

  // Choices
  const out = dismissedIds(state, inn);
  const atCrease = new Set([strikerId, nonId].filter(Boolean));
  // A shared player bowling the current (incomplete) over must finish it before he can bat.
  const midOverSharedBowler =
    last && last.overNumber === overIndex && isSharedPlayer(state.config, last.bowlerId) ? last.bowlerId : '';
  // A batter who has just retired (no ball since) is not offered as his own replacement; retired-hurt
  // batters are otherwise ordinary candidates because they are not in dismissedIds.
  const justRetired = new Set(
    (state.retires ?? []).filter((r) => r.inningsIndex === inn && r.at === state.events.length).map((r) => r.playerId),
  );
  const batterChoices = squadPlayers(state, bat).filter(
    (p) =>
      !out.has(p.id) &&
      !atCrease.has(p.id) &&
      !justRetired.has(p.id) &&
      canSharedPlayerBat(state, p.id, inn) &&
      p.id !== midOverSharedBowler,
  );
  const cap = state.config.rules.maxOversPerBowler;
  const fielders = squadPlayers(state, field);
  // A shared player currently at the crease cannot also bowl (simultaneity only).
  const bowlable = fielders.filter((p) => canSharedPlayerBowl(state, p.id, inn));
  const eligible = bowlable.filter(
    (p) => p.id !== last?.bowlerId && (cap === undefined || bowlerOversBowled(state, p.id, inn) < cap),
  );
  // Nobody eligible (tiny sides): relax the cap but never let the same bowler go twice in a row.
  const relaxed = bowlable.length > 1 ? bowlable.filter((p) => p.id !== last?.bowlerId) : bowlable;
  const bowlerChoices = eligible.length > 0 ? eligible : relaxed;
  const capHint = eligible.length === 0;
  // Mid-over change: anyone allowed to bowl except the current bowler; relax the cap only if that leaves nobody.
  const swapEligible = bowlable.filter(
    (p) => p.id !== bowlerId && (cap === undefined || bowlerOversBowled(state, p.id, inn) < cap),
  );
  const changeBowlerChoices = swapEligible.length > 0 ? swapEligible : bowlable.filter((p) => p.id !== bowlerId);

  const overBalls = events.filter((e) => e.overNumber === overIndex);
  const orbs = overBalls.map((e) => glyphFor(e, sc));

  const tgt = target(state);
  const cs = chaseStatus(state);
  const first = sides(state, 0).bat;
  const winnerTeam = result.winner ? (result.winner === 'A' ? state.config.teamA : state.config.teamB) : null;
  const margin = (result.margin ?? '').replace(/^by /, '');

  const clearPick = (): void => setBatterPick(null);

  return {
    phase,
    need,
    inningsIndex: inn,
    runs: teamTotal(state, inn),
    wickets: wicketsDown(state, inn),
    overs: oversText(legal),
    freeHit: isFreeHit(state),
    battingTeam: bat.name,
    chase: cs && tgt !== null ? { target: tgt, runsNeeded: cs.runsNeeded, ballsRemaining: cs.ballsRemaining } : null,
    firstInningsLine: sc('inningsTotal', {
      team: first.name,
      runs: teamTotal(state, 0),
      wickets: wicketsDown(state, 0),
      overs: oversText(state.events.filter((e) => e.inningsIndex === 0 && e.legal).length),
    }),
    result,
    winnerName: winnerTeam?.name ?? '',
    striker: line(strikerId),
    nonStriker: line(nonId),
    bowler,
    orbs,
    batterChoices,
    bowlerChoices,
    capHint,
    changeBowlerChoices: phase === 'live' && need === null && !!bowlerId ? changeBowlerChoices : [],
    fielderChoices: fielders,
    keeperId: teamWicketkeeperId(state.config, bowlingSide(state, inn)),
    sharedIds: Object.keys(state.config.players).filter((id) => isSharedPlayer(state.config, id)),
    byesEnabled: state.config.rules.byesEnabled,
    canUndo: state.events.length > 0 || (state.retires?.length ?? 0) > 0,
    canRedo: state.redo.length > 0 || (state.redoRetires?.length ?? 0) > 0,
    milestone: milestones[0] ?? null,
    dismissMilestone: () => setMilestones((q) => q.slice(1)),
    submit(part) {
      // Re-derive from the live store so a rapid double-tap can't act on a stale render.
      const fresh = store.getState().state;
      if (!fresh) return false;
      const cur = resolveLive(fresh, picks);
      if (cur.phase !== 'live' || cur.need !== null) return false;
      const t = part.extra?.type;
      if ((t === 'bye' || t === 'legbye') && !fresh.config.rules.byesEnabled) return false;
      store.getState().delivery({ strikerId: cur.strikerId, nonStrikerId: cur.nonId, bowlerId: cur.bowlerId, ...part });
      setBatterPick(null);
      const after = store.getState().state;
      if (after) {
        const found: PendingMilestone[] = [];
        for (const m of lastBallMilestones(after)) {
          const key = `${m.inningsIndex}:${m.kind}:${m.playerId}`;
          if (celebrated.current.has(key)) continue;
          celebrated.current.add(key);
          found.push({ key, kind: m.kind, playerName: after.config.players[m.playerId]?.name ?? m.playerId });
        }
        if (found.length > 0) setMilestones((q) => [...q, ...found]);
      }
      // The single haptic for a confirmed ball (pad buttons are silent).
      if (part.wicket) haptic('warning');
      else if (part.runsBat === 4 || part.runsBat === 6) haptic('heavy');
      else haptic('light');
      return true;
    },
    undo() {
      clearPick();
      setBowlerChange(null);
      setMilestones([]);
      store.getState().undo();
    },
    redo() {
      clearPick();
      setBowlerChange(null);
      store.getState().redo();
    },
    begin(s, n, b) {
      if (phase === 'break') store.getState().startNextInnings();
      setOpeners({ inn, striker: s, non: n });
      setBowlerPick({ inn, id: b });
    },
    pickBatter: setBatterPick,
    pickBowler: (id) => setBowlerPick({ inn, id }),
    retire(playerId, isOut) {
      const fresh = store.getState().state;
      if (!fresh) return false;
      const cur = resolveLive(fresh, picks);
      if (cur.phase !== 'live' || cur.need !== null) return false;
      if (playerId !== cur.strikerId && playerId !== cur.nonId) return false;
      store.getState().retire({ playerId, out: isOut });
      setBatterPick(null);
      return true;
    },
    changeBowler(id) {
      const fresh = store.getState().state;
      if (!fresh) return;
      const cur = resolveLive(fresh, picks);
      if (cur.phase !== 'live' || !cur.bowlerId) return;
      setBowlerChange({ inn: cur.inn, at: fresh.events.length, id });
    },
  };
}
