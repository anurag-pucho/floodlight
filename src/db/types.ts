import type { MatchState } from '../engine';

export type MatchStatus = 'in_progress' | 'complete';
export type SqlParam = string | number | null;

/** Minimal async SQLite port; implemented by expo-sqlite in the app and by a fake in tests. */
export interface Database {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  getAll<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
}

export interface MatchSummary {
  id: string;
  teamAName: string;
  teamBName: string;
  overs: number;
  status: MatchStatus;
  updatedAt: number;
}

export interface MatchRepo {
  saveMatch(state: MatchState, status: MatchStatus): Promise<void>;
  loadMatch(id: string): Promise<MatchState | null>;
  listMatches(): Promise<MatchSummary[]>;
  getResumable(): Promise<MatchState | null>;
  deleteMatch(id: string): Promise<void>;
}
