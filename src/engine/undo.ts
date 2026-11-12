import { BallRecord, DeliveryInput, MatchState } from './types';
import { buildRecord } from './applyDelivery';

/** Strip the positional (derived) fields, keeping only what the scorer entered. */
function toInput(r: BallRecord): DeliveryInput {
  const { id: _id, inningsIndex: _i, legal: _l, freeHit: _f, overNumber: _o, ballInOver: _b, ...input } = r;
  return input;
}

/**
 * Re-fold records onto an empty log, recomputing every positional field but
 * preserving each record's existing id.
 */
function refold(state: MatchState, records: BallRecord[], redoStack: BallRecord[]): MatchState {
  let s: MatchState = { ...state, events: [], redo: redoStack };
  for (const r of records) {
    s = { ...s, events: [...s.events, buildRecord(s, toInput(r), r.id)] };
  }
  return s;
}

export function undo(state: MatchState): MatchState {
  if (state.events.length === 0) return state;
  const last = state.events[state.events.length - 1];
  return refold(state, state.events.slice(0, -1), [...state.redo, last]);
}

export function redo(state: MatchState): MatchState {
  if (state.redo.length === 0) return state;
  const next = state.redo[state.redo.length - 1];
  return refold(state, [...state.events, next], state.redo.slice(0, -1));
}

export function editBall(state: MatchState, ballId: string, input: DeliveryInput): MatchState {
  const idx = state.events.findIndex(e => e.id === ballId);
  if (idx === -1) throw new Error(`No ball with id ${ballId}`);
  const records = state.events.map((e, i) => (i === idx ? ({ ...input, id: e.id } as BallRecord) : e));
  return refold(state, records, []);
}

/** Pure view of the match after the first `ballIndex` events. */
export function replayTo(state: MatchState, ballIndex: number): MatchState {
  const k = Math.max(0, Math.min(ballIndex, state.events.length));
  return refold(state, state.events.slice(0, k), []);
}
