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
export interface SquadPlayer { playerId: string; isShared: boolean; }
export interface TeamConfig { id: string; name: string; color: string; players: SquadPlayer[]; }
export interface MatchConfig {
  id: string;
  teamA: TeamConfig;
  teamB: TeamConfig;
  players: Record<string, Player>;
  rules: MatchRules;
  battingFirst: 'A' | 'B';
}
export interface DeliveryInput {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsBat: number;
  extra?: { type: ExtraType; runs: number };
  wicket?: { type: WicketType; outPlayerId: string; fielderId?: string };
}
export interface BallRecord extends DeliveryInput {
  id: string;
  inningsIndex: 0 | 1;
  legal: boolean;
  freeHit: boolean;
  overNumber: number;
  ballInOver: number;
}
export interface MatchState { config: MatchConfig; events: BallRecord[]; redo: BallRecord[]; }
