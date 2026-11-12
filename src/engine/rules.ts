import { BallRecord, DeliveryInput, MatchRules, WicketType } from './types';

/** Runs that were physically run (decide strike rotation). */
export function runsRun(d: DeliveryInput): number {
  const extra = d.extra;
  if (!extra) return d.runsBat;
  switch (extra.type) {
    case 'wide':
    case 'bye':
    case 'legbye':
      return extra.runs;
    case 'noball':
      return d.runsBat;
  }
}

export function isLegalDelivery(d: DeliveryInput): boolean {
  return !d.extra || d.extra.type === 'bye' || d.extra.type === 'legbye';
}

/** Dismissals possible on a given delivery type. */
export function wicketAllowed(type: WicketType, d: DeliveryInput, freeHit: boolean): boolean {
  const runOutOrStumped = type === 'runout' || type === 'stumped';
  if (d.extra?.type === 'wide') return runOutOrStumped;
  if (d.extra?.type === 'noball') return type === 'runout';
  if (freeHit) return type === 'runout' || type === 'retired';
  return true;
}

/** Total runs the fielding side concedes to the batting side on this ball. */
export function ballTotalRuns(b: BallRecord, rules: MatchRules): number {
  const e = b.extra;
  if (!e) return b.runsBat;
  switch (e.type) {
    case 'wide': return rules.wideRuns + e.runs;
    case 'noball': return rules.noBallRuns + b.runsBat;
    case 'bye':
    case 'legbye': return e.runs;
  }
}

/** Runs charged to the bowler (byes/leg-byes excluded). */
export function ballBowlerRuns(b: BallRecord, rules: MatchRules): number {
  const e = b.extra;
  if (e && (e.type === 'bye' || e.type === 'legbye')) return 0;
  return ballTotalRuns(b, rules);
}
