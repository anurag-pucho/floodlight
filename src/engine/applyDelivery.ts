import { BallRecord, DeliveryInput, MatchState } from './types';
import { currentInningsIndex, isFreeHit, legalBallCount } from './select';
import { BALLS_PER_OVER, isLegalDelivery, wicketAllowed } from './rules';

export function applyDelivery(state: MatchState, input: DeliveryInput): MatchState {
  const extraType = input.extra?.type;
  if ((extraType === 'bye' || extraType === 'legbye') && !state.config.rules.byesEnabled) {
    throw new Error('Byes and leg-byes are disabled for this match');
  }
  const inningsIndex = currentInningsIndex(state);
  const legal = isLegalDelivery(input);
  const freeHit = isFreeHit(state);
  const priorLegal = legalBallCount(state, inningsIndex);
  const { wicket, ...rest } = input;
  const record: BallRecord = {
    ...rest,
    ...(wicket && wicketAllowed(wicket.type, input, freeHit) ? { wicket } : {}),
    id: `${state.config.id}-${state.events.length + 1}`,
    inningsIndex,
    legal,
    freeHit,
    overNumber: Math.floor(priorLegal / BALLS_PER_OVER),
    ballInOver: (priorLegal % BALLS_PER_OVER) + 1,
  };
  return { ...state, events: [...state.events, record], redo: [] };
}
