import type { DeliveryInput, MatchConfig, MatchState } from '../engine';
import type { MatchRepo } from '../db/types';

/** Subset of the repo the store depends on; injectable for tests. */
export type StoreRepo = Pick<MatchRepo, 'saveMatch' | 'loadMatch' | 'getResumable'>;

export interface MatchStoreState {
  state: MatchState | null;
  newMatch(config: MatchConfig): void;
  delivery(input: DeliveryInput): void;
  retire(input: { playerId: string; out: boolean }): void;
  undo(): void;
  redo(): void;
  editBall(ballId: string, input: DeliveryInput): void;
  startNextInnings(): void;
  resume(): Promise<boolean>;
  loadById(id: string): Promise<void>;
  finishMatch(): void;
}

export interface MatchStoreOptions {
  /** Returns the repo; called lazily on first use. */
  getRepo: () => StoreRepo;
  debounceMs?: number;
}
