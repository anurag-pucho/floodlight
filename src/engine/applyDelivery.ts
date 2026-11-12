import { BallRecord, DeliveryInput, MatchState, RetireEvent } from './types';
import { batsmenAtCrease, currentInningsIndex, isFreeHit, legalBallCount } from './select';
import { BALLS_PER_OVER, isLegalDelivery, wicketAllowed } from './rules';

/** Build a record for `input` against the current events of `state`, using the given id. */
export function buildRecord(state: MatchState, input: DeliveryInput, id: string): BallRecord {
  const extraType = input.extra?.type;
  if ((extraType === 'bye' || extraType === 'legbye') && !state.config.rules.byesEnabled) {
    throw new Error('Byes and leg-byes are disabled for this match');
  }
  const inningsIndex = currentInningsIndex(state);
  const legal = isLegalDelivery(input);
  const freeHit = isFreeHit(state);
  const priorLegal = legalBallCount(state, inningsIndex);
  const { wicket, ...rest } = input;
  return {
    ...rest,
    ...(wicket && wicketAllowed(wicket.type, input, freeHit) ? { wicket } : {}),
    ...(wicket ? { enteredWicket: wicket } : {}),
    id,
    inningsIndex,
    legal,
    freeHit,
    overNumber: Math.floor(priorLegal / BALLS_PER_OVER),
    ballInOver: (priorLegal % BALLS_PER_OVER) + 1,
  };
}

export function applyDelivery(state: MatchState, input: DeliveryInput): MatchState {
  const seq = state.seq + 1;
  const record = buildRecord(state, input, `${state.config.id}-${seq}`);
  return {
    ...state,
    events: [...state.events, record],
    redo: [],
    ...(state.redoRetires ? { redoRetires: [] } : {}),
    seq,
  };
}

/**
 * Log a retirement for the current innings. Once the innings has deliveries the player must be at
 * the crease; before the first ball the openers live only in the scorer's picks, so any id is accepted.
 */
export function applyRetire(state: MatchState, input: { playerId: string; out: boolean }): MatchState {
  const inningsIndex = currentInningsIndex(state);
  const started = state.events.some(e => e.inningsIndex === inningsIndex);
  const crease = batsmenAtCrease(state);
  if (
    input.playerId === '' ||
    (started && crease.strikerId !== input.playerId && crease.nonStrikerId !== input.playerId)
  ) {
    throw new Error('Only a batter at the crease can retire');
  }
  const seq = state.seq + 1;
  const event: RetireEvent = {
    id: `${state.config.id}-r${seq}`,
    seq,
    kind: 'retire',
    inningsIndex: currentInningsIndex(state),
    playerId: input.playerId,
    out: input.out,
    at: state.events.length,
  };
  return { ...state, retires: [...(state.retires ?? []), event], redo: [], redoRetires: [], seq };
}
