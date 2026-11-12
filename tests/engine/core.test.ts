import {
  createMatch,
  applyDelivery,
  legalBallsInCurrentOver,
  onStrikeId,
  MatchConfig,
  MatchState,
  DeliveryInput,
} from '../../src/engine';

function makeConfig(): MatchConfig {
  return {
    id: 'm1',
    teamA: { id: 'A', name: 'Team A', color: '#f00', players: [{ playerId: 'a1', isShared: false }, { playerId: 'a2', isShared: false }] },
    teamB: { id: 'B', name: 'Team B', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' },
    },
    rules: { oversPerInnings: 5, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}

const ball = (runsBat: number, strikerId = 'a1', nonStrikerId = 'a2'): DeliveryInput => ({
  strikerId, nonStrikerId, bowlerId: 'b1', runsBat,
});

// Feed deliveries using whoever is currently on strike, like a real scorer.
function play(state: MatchState, runs: number[]): MatchState {
  let s = state;
  for (const r of runs) {
    const striker = s.events.length === 0 ? 'a1' : onStrikeId(s);
    const non = striker === 'a1' ? 'a2' : 'a1';
    s = applyDelivery(s, ball(r, striker, non));
  }
  return s;
}

describe('engine core', () => {
  it('createMatch returns empty events/redo with config intact', () => {
    const config = makeConfig();
    const s = createMatch(config);
    expect(s.events).toEqual([]);
    expect(s.redo).toEqual([]);
    expect(s.config).toBe(config);
  });

  it('a single run rotates strike and records a legal ball', () => {
    const s = applyDelivery(createMatch(makeConfig()), ball(1));
    expect(s.events).toHaveLength(1);
    expect(s.events[0].legal).toBe(true);
    expect(s.events[0].overNumber).toBe(0);
    expect(s.events[0].ballInOver).toBe(1);
    expect(s.events[0].inningsIndex).toBe(0);
    expect(s.events[0].freeHit).toBe(false);
    expect(onStrikeId(s)).toBe('a2');
  });

  it('does not mutate the previous state and clears redo', () => {
    const s0 = createMatch(makeConfig());
    const s1 = applyDelivery({ ...s0, redo: [] }, ball(0));
    expect(s0.events).toHaveLength(0);
    expect(s1.redo).toEqual([]);
  });

  it('2 runs and 0 runs do not rotate strike', () => {
    expect(onStrikeId(applyDelivery(createMatch(makeConfig()), ball(2)))).toBe('a1');
    expect(onStrikeId(applyDelivery(createMatch(makeConfig()), ball(0)))).toBe('a1');
  });

  it('six dots complete an over and rotate strike once', () => {
    let s = play(createMatch(makeConfig()), [0, 0, 0, 0, 0]);
    expect(legalBallsInCurrentOver(s)).toBe(5);
    expect(onStrikeId(s)).toBe('a1');
    s = play(s, [0]);
    expect(legalBallsInCurrentOver(s)).toBe(0);
    expect(onStrikeId(s)).toBe('a2');
    s = play(s, [0]);
    const seventh = s.events[6];
    expect(seventh.overNumber).toBe(1);
    expect(seventh.ballInOver).toBe(1);
    expect(legalBallsInCurrentOver(s)).toBe(1);
  });

  it('accepts 4 and 6', () => {
    const s = play(createMatch(makeConfig()), [4, 6]);
    expect(s.events.map(e => e.runsBat)).toEqual([4, 6]);
    expect(onStrikeId(s)).toBe('a1');
  });
});
