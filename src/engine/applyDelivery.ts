import { BallRecord, DeliveryInput, MatchState } from './types';
import { currentInningsIndex, legalBallCount } from './select';

const BALLS_PER_OVER = 6;

export function applyDelivery(state: MatchState, input: DeliveryInput): MatchState {
  const inningsIndex = currentInningsIndex(state);
  const legal = true; // extras arrive in E2
  const priorLegal = legalBallCount(state, inningsIndex);
  const record: BallRecord = {
    ...input,
    id: `${state.config.id}-${state.events.length + 1}`,
    inningsIndex,
    legal,
    freeHit: false,
    overNumber: Math.floor(priorLegal / BALLS_PER_OVER),
    ballInOver: (priorLegal % BALLS_PER_OVER) + 1,
  };
  return { config: state.config, events: [...state.events, record], redo: [] };
}
