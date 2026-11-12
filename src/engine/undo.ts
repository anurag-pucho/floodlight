import { BallRecord, DeliveryInput, MatchState, RetireEvent } from './types';
import { buildRecord } from './applyDelivery';

/** Strip the positional (derived) fields, keeping only what the scorer entered. */
function toInput(r: BallRecord): DeliveryInput {
  const {
    id: _id, inningsIndex: _i, legal: _l, freeHit: _f, overNumber: _o, ballInOver: _b,
    enteredWicket, wicket, ...input
  } = r;
  const raw = enteredWicket ?? wicket;
  return raw ? { ...input, wicket: raw } : input;
}

/**
 * Re-fold records onto an empty log, recomputing every positional field but
 * preserving each record's existing id. Retire events are re-inserted at their
 * original positions (they affect wickets, hence the innings pointer) as we go.
 */
function refold(
  state: MatchState,
  records: BallRecord[],
  redoStack: BallRecord[],
  retires: RetireEvent[],
  redoRetires: RetireEvent[],
): MatchState {
  const hasRetires = state.retires !== undefined || state.redoRetires !== undefined || retires.length > 0 || redoRetires.length > 0;
  const withRetires = (s: MatchState, upTo: number): MatchState => {
    const due = retires.filter(r => r.at <= upTo);
    return hasRetires ? { ...s, retires: due } : s;
  };
  let s: MatchState = {
    ...state,
    events: [],
    redo: redoStack,
    ...(hasRetires ? { retires: [], redoRetires } : {}),
  };
  for (let i = 0; i < records.length; i++) {
    s = withRetires(s, i);
    s = { ...s, events: [...s.events, buildRecord(s, toInput(records[i]), records[i].id)] };
  }
  return withRetires(s, Number.POSITIVE_INFINITY);
}

/** True when a retire event is the most recent item of the combined log. */
function lastIsRetire(state: MatchState): boolean {
  const rs = state.retires ?? [];
  return rs.length > 0 && rs[rs.length - 1].at === state.events.length;
}

export function undo(state: MatchState): MatchState {
  const retires = state.retires ?? [];
  const redoRetires = state.redoRetires ?? [];
  if (lastIsRetire(state)) {
    const last = retires[retires.length - 1];
    return refold(state, state.events, state.redo, retires.slice(0, -1), [...redoRetires, last]);
  }
  if (state.events.length === 0) return state;
  const last = state.events[state.events.length - 1];
  return refold(state, state.events.slice(0, -1), [...state.redo, last], retires, redoRetires);
}

export function redo(state: MatchState): MatchState {
  const retires = state.retires ?? [];
  const redoRetires = state.redoRetires ?? [];
  const nextRetire = redoRetires[redoRetires.length - 1];
  // An undone retire that was logged before the next undone delivery comes back first.
  if (nextRetire && nextRetire.at === state.events.length) {
    return refold(state, state.events, state.redo, [...retires, nextRetire], redoRetires.slice(0, -1));
  }
  if (state.redo.length === 0) return state;
  const next = state.redo[state.redo.length - 1];
  return refold(state, [...state.events, next], state.redo.slice(0, -1), retires, redoRetires);
}

export function editBall(state: MatchState, ballId: string, input: DeliveryInput): MatchState {
  const idx = state.events.findIndex(e => e.id === ballId);
  if (idx === -1) throw new Error(`No ball with id ${ballId}`);
  const records = state.events.map((e, i) => (i === idx ? ({ ...input, id: e.id } as BallRecord) : e));
  return refold(state, records, [], state.retires ?? [], []);
}

/** Pure view of the match after the first `ballIndex` events. */
export function replayTo(state: MatchState, ballIndex: number): MatchState {
  const k = Math.max(0, Math.min(ballIndex, state.events.length));
  return refold(state, state.events.slice(0, k), [], (state.retires ?? []).filter(r => r.at <= k), []);
}
