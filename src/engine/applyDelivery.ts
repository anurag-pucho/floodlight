import { BallRecord, DeliveryInput, MatchState } from './types';
import { currentInningsIndex, isFreeHit, legalBallCount } from './select';
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
  return { ...state, events: [...state.events, record], redo: [], seq };
}
