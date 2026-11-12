export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye';
export type WicketType = 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket' | 'retired';
export interface Player { id: string; name: string; }
export interface MatchRules {
  oversPerInnings: number;
  wideRuns: number;
  noBallRuns: number;
  freeHitOnNoBall: boolean;
  lastManStands: boolean;
  byesEnabled: boolean;
  maxOversPerBowler?: number;
}
export interface SquadPlayer { playerId: string; isShared: boolean; isCaptain?: boolean; isWicketkeeper?: boolean; }
export interface TeamConfig { id: string; name: string; color: string; players: SquadPlayer[]; }
export interface MatchConfig {
  id: string;
  teamA: TeamConfig;
  teamB: TeamConfig;
  players: Record<string, Player>;
  rules: MatchRules;
  battingFirst: 'A' | 'B';
}
export interface Wicket { type: WicketType; outPlayerId: string; fielderId?: string }
export interface DeliveryInput {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsBat: number;
  extra?: { type: ExtraType; runs: number };
  wicket?: Wicket;
}
export interface BallRecord extends DeliveryInput {
  id: string;
  inningsIndex: 0 | 1;
  legal: boolean;
  freeHit: boolean;
  overNumber: number;
  ballInOver: number;
  /** Raw wicket as entered; `wicket` is the effective one after rule filtering. */
  enteredWicket?: Wicket;
}
/**
 * A non-delivery log event: a batter leaves the crease without a ball being bowled.
 * `out:true` is a dismissal ("retired out"); `out:false` is retired hurt (may bat again).
 * `at` is the number of deliveries in `events` when it was logged, which fixes its position
 * in the combined log (it sits just before delivery index `at`).
 */
export interface RetireEvent {
  id: string;
  seq: number;
  kind: 'retire';
  inningsIndex: 0 | 1;
  playerId: string;
  out: boolean;
  at: number;
}
export interface MatchState {
  config: MatchConfig;
  events: BallRecord[];
  /** Retire events, interleaved with `events` via `at`. Absent on legacy states (treated as empty). */
  retires?: RetireEvent[];
  redo: BallRecord[];
  /** Undone retire events awaiting redo (same stack discipline as `redo`). */
  redoRetires?: RetireEvent[];
  /** Monotonic counter for ball ids; incremented on every append, never reused. */
  seq: number;
}
