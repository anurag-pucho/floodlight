import { BallRecord, MatchConfig, MatchState } from './types';
import { BALLS_PER_OVER, ballBowlerRuns, ballTotalRuns, runsRun } from './rules';

export function currentInningsIndex(state: MatchState): 0 | 1 {
  // Derived from the event log: innings 1 begins once innings 0 is complete.
  return inningsComplete(state, 0) ? 1 : 0;
}

export function inningsEvents(state: MatchState, inningsIndex: 0 | 1): BallRecord[] {
  return state.events.filter(e => e.inningsIndex === inningsIndex);
}

export function legalBallCount(state: MatchState, inningsIndex: 0 | 1): number {
  return inningsEvents(state, inningsIndex).filter(e => e.legal).length;
}

export function legalBallsInCurrentOver(state: MatchState): number {
  return legalBallCount(state, currentInningsIndex(state)) % BALLS_PER_OVER;
}

/**
 * Batters at the crease after the last delivery, derived by folding the event log.
 * Each delivery declares its own pair (so a replacement is picked up on the next
 * delivery); a dismissed batter's slot is '' until that replacement is supplied.
 */
export function batsmenAtCrease(state: MatchState): { strikerId: string; nonStrikerId: string } {
  return creaseFor(state, currentInningsIndex(state));
}

function creaseFor(state: MatchState, inningsIndex: 0 | 1): { strikerId: string; nonStrikerId: string } {
  const events = inningsEvents(state, inningsIndex);
  let striker = '';
  let non = '';
  let legal = 0;
  for (const e of events) {
    striker = e.strikerId;
    non = e.nonStrikerId;
    if (runsRun(e) % 2 === 1) [striker, non] = [non, striker];
    if (e.legal) {
      legal += 1;
      if (legal % BALLS_PER_OVER === 0) [striker, non] = [non, striker];
    }
    if (e.wicket) {
      if (striker === e.wicket.outPlayerId) striker = '';
      else if (non === e.wicket.outPlayerId) non = '';
    }
  }
  return { strikerId: striker, nonStrikerId: non };
}

/** Id on strike for the next delivery, derived by folding the event log. */
export function onStrikeId(state: MatchState): string {
  return batsmenAtCrease(state).strikerId;
}

export function dismissedIds(state: MatchState, inningsIndex: 0 | 1): Set<string> {
  const out = new Set<string>();
  for (const e of inningsEvents(state, inningsIndex)) if (e.wicket) out.add(e.wicket.outPlayerId);
  return out;
}

export function wicketsDown(state: MatchState, inningsIndex: 0 | 1): number {
  return inningsEvents(state, inningsIndex).filter(e => e.wicket).length;
}

/** Wickets credited to a bowler (run-outs excluded). */
export function bowlerWickets(state: MatchState, bowlerId: string, inningsIndex: 0 | 1): number {
  return state.events.filter(
    e => e.bowlerId === bowlerId && e.inningsIndex === inningsIndex
      && e.wicket && e.wicket.type !== 'runout',
  ).length;
}

/** Completed overs bowled by a bowler in an innings (legal balls only). */
export function bowlerOversBowled(state: MatchState, bowlerId: string, inningsIndex: 0 | 1): number {
  const legal = inningsEvents(state, inningsIndex).filter(e => e.bowlerId === bowlerId && e.legal).length;
  return Math.floor(legal / BALLS_PER_OVER);
}

export function battingSquadSize(state: MatchState, inningsIndex: 0 | 1): number {
  const first = state.config.battingFirst === 'A' ? state.config.teamA : state.config.teamB;
  const second = state.config.battingFirst === 'A' ? state.config.teamB : state.config.teamA;
  return (inningsIndex === 0 ? first : second).players.length;
}

/** True when the current innings has ended (overs exhausted or all out). */
export function isInningsComplete(state: MatchState): boolean {
  // Until a delivery of the chase is played, "the innings" is the one that just ended.
  if (inningsEvents(state, 1).length === 0) return inningsComplete(state, 0);
  return inningsComplete(state, 1);
}

export function inningsComplete(state: MatchState, idx: 0 | 1): boolean {
  if (idx === 1) {
    const t = target(state);
    if (t !== null && teamTotal(state, 1) >= t) return true;
  }
  const { oversPerInnings, lastManStands } = state.config.rules;
  if (legalBallCount(state, idx) >= oversPerInnings * BALLS_PER_OVER) return true;
  const squad = battingSquadSize(state, idx);
  const limit = lastManStands ? squad : squad - 1;
  return wicketsDown(state, idx) >= limit;
}

export interface FallOfWicket { wicketNo: number; score: number; over: string; outPlayerId: string; }

export function fallOfWickets(state: MatchState, inningsIndex: 0 | 1): FallOfWicket[] {
  const out: FallOfWicket[] = [];
  let score = 0;
  let legal = 0;
  for (const e of inningsEvents(state, inningsIndex)) {
    score += ballTotalRuns(e, state.config.rules);
    if (e.legal) legal += 1;
    if (e.wicket) {
      out.push({
        wicketNo: out.length + 1,
        score,
        over: `${Math.floor(legal / BALLS_PER_OVER)}.${legal % BALLS_PER_OVER}`,
        outPlayerId: e.wicket.outPlayerId,
      });
    }
  }
  return out;
}

/** True iff the next legal delivery is a free hit. */
export function isFreeHit(state: MatchState): boolean {
  if (!state.config.rules.freeHitOnNoBall) return false;
  const events = inningsEvents(state, currentInningsIndex(state));
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.legal) return false;
    if (e.extra?.type === 'noball') return true;
    // a wide does not consume the free hit; keep looking back
  }
  return false;
}

export interface TeamExtras { wides: number; noBalls: number; byes: number; legByes: number; total: number; }

export function teamExtras(state: MatchState, inningsIndex: 0 | 1): TeamExtras {
  const { wideRuns, noBallRuns } = state.config.rules;
  const out: TeamExtras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
  for (const e of inningsEvents(state, inningsIndex)) {
    if (!e.extra) continue;
    switch (e.extra.type) {
      case 'wide': out.wides += wideRuns + e.extra.runs; break;
      case 'noball': out.noBalls += noBallRuns; break;
      case 'bye': out.byes += e.extra.runs; break;
      case 'legbye': out.legByes += e.extra.runs; break;
    }
  }
  out.total = out.wides + out.noBalls + out.byes + out.legByes;
  return out;
}

export function teamTotal(state: MatchState, inningsIndex: 0 | 1): number {
  return inningsEvents(state, inningsIndex).reduce((sum, e) => sum + ballTotalRuns(e, state.config.rules), 0);
}

/** Runs credited to a batter (bat runs only, never byes/leg-byes/wides). */
export function batterRuns(state: MatchState, batterId: string, inningsIndex: 0 | 1): number {
  return state.events
    .filter(e => e.strikerId === batterId && e.inningsIndex === inningsIndex)
    .reduce((sum, e) => sum + e.runsBat, 0);
}

/** Runs conceded by a bowler (excludes byes and leg-byes). */
export function bowlerConceded(state: MatchState, bowlerId: string, inningsIndex: 0 | 1): number {
  return state.events
    .filter(e => e.bowlerId === bowlerId && e.inningsIndex === inningsIndex)
    .reduce((sum, e) => sum + ballBowlerRuns(e, state.config.rules), 0);
}

export function battingSide(state: MatchState, inningsIndex: 0 | 1): 'A' | 'B' {
  const first = state.config.battingFirst;
  return inningsIndex === 0 ? first : first === 'A' ? 'B' : 'A';
}

export function bowlingSide(state: MatchState, inningsIndex: 0 | 1): 'A' | 'B' {
  return battingSide(state, inningsIndex) === 'A' ? 'B' : 'A';
}

export function teamCaptainId(config: MatchConfig, side: 'A' | 'B'): string | undefined {
  return (side === 'A' ? config.teamA : config.teamB).players.find(p => p.isCaptain)?.playerId;
}

export function teamWicketkeeperId(config: MatchConfig, side: 'A' | 'B'): string | undefined {
  return (side === 'A' ? config.teamA : config.teamB).players.find(p => p.isWicketkeeper)?.playerId;
}

/** True when the player is marked shared in BOTH squads. */
export function isSharedPlayer(config: MatchConfig, playerId: string): boolean {
  const shared = (t: MatchConfig['teamA']) => t.players.some(p => p.playerId === playerId && p.isShared);
  return shared(config.teamA) && shared(config.teamB);
}

/** Simultaneity guard: a shared player currently at the crease (not out) cannot bowl. */
export function canSharedPlayerBowl(state: MatchState, playerId: string, inningsIndex: 0 | 1): boolean {
  if (!isSharedPlayer(state.config, playerId)) return true;
  const crease = creaseFor(state, inningsIndex);
  return crease.strikerId !== playerId && crease.nonStrikerId !== playerId;
}

/** A shared player may bat unless already out this innings (bowling earlier does not block batting). */
export function canSharedPlayerBat(state: MatchState, playerId: string, inningsIndex: 0 | 1): boolean {
  if (!isSharedPlayer(state.config, playerId)) return true;
  return !dismissedIds(state, inningsIndex).has(playerId);
}

/** Target for the chasing side: innings-0 total + 1, once innings 0 is complete. */
export function target(state: MatchState): number | null {
  return inningsComplete(state, 0) ? teamTotal(state, 0) + 1 : null;
}

export interface ChaseStatus { runsNeeded: number; ballsRemaining: number; requiredRunRate: number; }

export function chaseStatus(state: MatchState): ChaseStatus | null {
  const t = target(state);
  if (t === null || currentInningsIndex(state) !== 1) return null;
  const runsNeeded = Math.max(0, t - teamTotal(state, 1));
  const ballsRemaining = Math.max(0, state.config.rules.oversPerInnings * BALLS_PER_OVER - legalBallCount(state, 1));
  const requiredRunRate = ballsRemaining === 0 ? 0 : (runsNeeded * BALLS_PER_OVER) / ballsRemaining;
  return { runsNeeded, ballsRemaining, requiredRunRate };
}

export interface MatchResult { decided: boolean; winner?: 'A' | 'B'; tie?: boolean; margin?: string; }

export function matchResult(state: MatchState): MatchResult {
  const t = target(state);
  if (t === null || currentInningsIndex(state) !== 1) return { decided: false };
  const chasing = teamTotal(state, 1);
  if (chasing >= t) {
    const { lastManStands } = state.config.rules;
    const squad = battingSquadSize(state, 1);
    const left = (lastManStands ? squad : squad - 1) - wicketsDown(state, 1);
    return { decided: true, winner: battingSide(state, 1), margin: `by ${left} ${left === 1 ? 'wicket' : 'wickets'}` };
  }
  if (!inningsComplete(state, 1)) return { decided: false };
  if (chasing === t - 1) return { decided: true, tie: true };
  return { decided: true, winner: battingSide(state, 0), margin: `by ${t - 1 - chasing} ${t - 1 - chasing === 1 ? 'run' : 'runs'}` };
}

export function needsSuperOver(state: MatchState): boolean {
  return matchResult(state).tie === true;
}

// ---------------------------------------------------------------------------
// Derived scorecard stats (all pure folds over the event log)
// ---------------------------------------------------------------------------

export interface BattingRow {
  playerId: string; runs: number; balls: number; fours: number; sixes: number;
  strikeRate: number; out: boolean; dismissal?: string;
}

function playerName(state: MatchState, id: string): string {
  return state.config.players[id]?.name ?? id;
}

function dismissalText(state: MatchState, e: BallRecord): string {
  const w = e.wicket;
  if (!w) return '';
  const bowler = playerName(state, e.bowlerId);
  const keeperId = teamWicketkeeperId(state.config, bowlingSide(state, e.inningsIndex));
  const isKeeper = w.fielderId !== undefined && w.fielderId === keeperId
    && (w.type === 'caught' || w.type === 'stumped');
  const fielder = w.fielderId ? `${isKeeper ? '†' : ''}${playerName(state, w.fielderId)}` : '';
  switch (w.type) {
    case 'bowled': return `b ${bowler}`;
    case 'lbw': return `lbw b ${bowler}`;
    case 'caught': return w.fielderId === e.bowlerId ? `c & b ${bowler}` : `c ${fielder} b ${bowler}`.replace('c  b', 'c b');
    case 'stumped': return `st ${fielder} b ${bowler}`.replace('st  b', 'st b');
    case 'hitwicket': return `hit wicket b ${bowler}`;
    case 'runout': return fielder ? `run out (${fielder})` : 'run out';
    case 'retired': return 'retired';
  }
}

/** Batting card in order of appearance. Balls faced exclude wides, include no-balls. */
export function battingCard(state: MatchState, inningsIndex: 0 | 1): BattingRow[] {
  const events = inningsEvents(state, inningsIndex);
  const order: string[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    for (const id of [e.strikerId, e.nonStrikerId]) {
      if (id && !seen.has(id)) { seen.add(id); order.push(id); }
    }
  }
  const dismissed = dismissedIds(state, inningsIndex);
  return order.map(playerId => {
    const faced = events.filter(e => e.strikerId === playerId && e.extra?.type !== 'wide');
    const balls = faced.length;
    const runs = batterRuns(state, playerId, inningsIndex);
    const row: BattingRow = {
      playerId,
      runs,
      balls,
      fours: faced.filter(e => e.runsBat === 4).length,
      sixes: faced.filter(e => e.runsBat === 6).length,
      strikeRate: balls === 0 ? 0 : (runs / balls) * 100,
      out: dismissed.has(playerId),
    };
    if (row.out) {
      const outEvent = events.find(e => e.wicket?.outPlayerId === playerId);
      if (outEvent) row.dismissal = dismissalText(state, outEvent);
    }
    return row;
  });
}

export interface BowlingRow {
  playerId: string; overs: string; maidens: number; runs: number; wickets: number;
  economy: number; dots: number; wides: number; noBalls: number;
}

/** Bowling card in order first bowled. Maidens/dots use runs charged to the bowler (byes/leg-byes excluded). */
export function bowlingCard(state: MatchState, inningsIndex: 0 | 1): BowlingRow[] {
  const events = inningsEvents(state, inningsIndex);
  const rules = state.config.rules;
  const order: string[] = [];
  for (const e of events) if (!order.includes(e.bowlerId)) order.push(e.bowlerId);
  return order.map(playerId => {
    const mine = events.filter(e => e.bowlerId === playerId);
    const legal = mine.filter(e => e.legal).length;
    const runs = bowlerConceded(state, playerId, inningsIndex);
    const overs = new Map<number, { legal: number; charged: number }>();
    for (const e of mine) {
      const o = overs.get(e.overNumber) ?? { legal: 0, charged: 0 };
      if (e.legal) o.legal += 1;
      o.charged += ballBowlerRuns(e, rules);
      overs.set(e.overNumber, o);
    }
    let maidens = 0;
    overs.forEach(o => { if (o.legal === BALLS_PER_OVER && o.charged === 0) maidens += 1; });
    return {
      playerId,
      overs: `${Math.floor(legal / BALLS_PER_OVER)}.${legal % BALLS_PER_OVER}`,
      maidens,
      runs,
      wickets: bowlerWickets(state, playerId, inningsIndex),
      economy: legal === 0 ? 0 : runs / (legal / BALLS_PER_OVER),
      dots: mine.filter(e => e.legal && ballBowlerRuns(e, rules) === 0).length,
      wides: mine.filter(e => e.extra?.type === 'wide').length,
      noBalls: mine.filter(e => e.extra?.type === 'noball').length,
    };
  });
}

export interface Partnership { forWicket: number; runs: number; balls: number; playerIds: [string, string]; }

/**
 * Partnerships in order. Runs are team runs (incl. extras) scored while the pair was in,
 * balls are legal deliveries; the wicket ball belongs to the partnership it ends.
 * playerIds = [striker, non-striker] of the partnership's first delivery.
 */
export function partnerships(state: MatchState, inningsIndex: 0 | 1): Partnership[] {
  const out: Partnership[] = [];
  let cur: Partnership | null = null;
  for (const e of inningsEvents(state, inningsIndex)) {
    if (!cur) cur = { forWicket: out.length + 1, runs: 0, balls: 0, playerIds: [e.strikerId, e.nonStrikerId] };
    cur.runs += ballTotalRuns(e, state.config.rules);
    if (e.legal) cur.balls += 1;
    if (e.wicket) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

/** One entry per over (including a partial last over); extras are attributed to the over they occur in. */
export function manhattan(state: MatchState, inningsIndex: 0 | 1): { over: number; runs: number; wickets: number }[] {
  const out: { over: number; runs: number; wickets: number }[] = [];
  for (const e of inningsEvents(state, inningsIndex)) {
    while (out.length <= e.overNumber) out.push({ over: out.length, runs: 0, wickets: 0 });
    out[e.overNumber].runs += ballTotalRuns(e, state.config.rules);
    if (e.wicket) out[e.overNumber].wickets += 1;
  }
  return out;
}

/**
 * Cumulative team runs after each legal ball. Runs from non-legal balls are carried into the
 * next legal ball's total; any trailing ones are folded into the last entry so it ends at the total.
 */
export function worm(state: MatchState, inningsIndex: 0 | 1): { ball: number; runs: number }[] {
  const out: { ball: number; runs: number }[] = [];
  let runs = 0;
  let legal = 0;
  let pending = false;
  for (const e of inningsEvents(state, inningsIndex)) {
    runs += ballTotalRuns(e, state.config.rules);
    if (e.legal) { legal += 1; out.push({ ball: legal, runs }); pending = false; }
    else pending = true;
  }
  if (pending) {
    if (out.length > 0) out[out.length - 1].runs = runs;
    else out.push({ ball: 0, runs });
  }
  return out;
}

/** Runs per over so far (0 before the first legal ball). */
export function runRate(state: MatchState, inningsIndex: 0 | 1): number {
  const legal = legalBallCount(state, inningsIndex);
  return legal === 0 ? 0 : teamTotal(state, inningsIndex) / (legal / BALLS_PER_OVER);
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export type MilestoneKind = 'fifty' | 'century' | 'threeWkts' | 'fourWkts' | 'fiveWkts';

export interface Milestone { kind: MilestoneKind; playerId: string; inningsIndex: 0 | 1; }

const WICKET_MILESTONES: Record<number, MilestoneKind> = { 3: 'threeWkts', 4: 'fourWkts', 5: 'fiveWkts' };

/**
 * Milestones caused by the most recent delivery only: a batter crossing 50 / 100 on this ball,
 * or a bowler's wicket tally reaching exactly 3, 4 or 5. Compares the state with and without
 * the last event, so it is deterministic under undo/redo.
 */
export function lastBallMilestones(state: MatchState): Milestone[] {
  const last = state.events[state.events.length - 1];
  if (!last) return [];
  const before: MatchState = { ...state, events: state.events.slice(0, -1) };
  const inn = last.inningsIndex;
  const out: Milestone[] = [];
  if (last.runsBat > 0) {
    const was = batterRuns(before, last.strikerId, inn);
    const now = was + last.runsBat;
    if (was < 50 && now >= 50 && !(was < 100 && now >= 100)) out.push({ kind: 'fifty', playerId: last.strikerId, inningsIndex: inn });
    if (was < 100 && now >= 100) out.push({ kind: 'century', playerId: last.strikerId, inningsIndex: inn });
  }
  if (last.wicket && last.wicket.type !== 'runout') {
    const kind = WICKET_MILESTONES[bowlerWickets(state, last.bowlerId, inn)];
    if (kind) out.push({ kind, playerId: last.bowlerId, inningsIndex: inn });
  }
  return out;
}
