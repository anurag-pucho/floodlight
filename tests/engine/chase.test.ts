import {
  createMatch,
  applyDelivery,
  startNextInnings,
  currentInningsIndex,
  target,
  chaseStatus,
  matchResult,
  needsSuperOver,
  teamTotal,
  MatchConfig,
  MatchState,
  DeliveryInput,
} from '../../src/engine';

function makeConfig(): MatchConfig {
  return {
    id: 'm1',
    teamA: {
      id: 'A', name: 'Team A', color: '#f00',
      players: [{ playerId: 'a1', isShared: false }, { playerId: 'a2', isShared: false }, { playerId: 'a3', isShared: false }],
    },
    teamB: { id: 'B', name: 'Team B', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' }, a3: { id: 'a3', name: 'A3' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' },
    },
    rules: { oversPerInnings: 1, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}

const first = (runsBat = 0): DeliveryInput => ({ strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runsBat });
const second = (runsBat = 0): DeliveryInput => ({ strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a1', runsBat });

function play(s: MatchState, d: DeliveryInput, n = 1): MatchState {
  let out = s;
  for (let i = 0; i < n; i++) out = applyDelivery(out, d);
  return out;
}

/** Innings 0 totals 6 (six singles), then the chase begins. */
const chaseStart = (): MatchState => startNextInnings(play(createMatch(makeConfig()), first(1), 6));

describe('innings transition', () => {
  it('stamps innings 0 until startNextInnings, then innings 1', () => {
    const s0 = play(createMatch(makeConfig()), first(1), 6);
    expect(currentInningsIndex(s0)).toBe(0);
    const s1 = applyDelivery(startNextInnings(s0), second(1));
    expect(currentInningsIndex(s1)).toBe(1);
    expect(s1.events[6].inningsIndex).toBe(1);
    expect(s1.events[5].inningsIndex).toBe(0);
    expect(teamTotal(s1, 1)).toBe(1);
  });

  it('refuses to start innings 1 before innings 0 is complete', () => {
    expect(() => startNextInnings(play(createMatch(makeConfig()), first(1), 3))).toThrow();
  });

  it('target is null until innings 0 completes, then total + 1', () => {
    expect(target(play(createMatch(makeConfig()), first(1), 3))).toBeNull();
    expect(target(chaseStart())).toBe(7);
  });

  it('pointer survives serialization of the state', () => {
    const s = JSON.parse(JSON.stringify(play(chaseStart(), second(1)))) as MatchState;
    expect(currentInningsIndex(s)).toBe(1);
  });
});

describe('chaseStatus', () => {
  it('is null outside innings 1', () => {
    expect(chaseStatus(createMatch(makeConfig()))).toBeNull();
  });
  it('reports runs needed, balls remaining and required rate mid-chase', () => {
    const s = play(chaseStart(), second(), 0);
    const mid = applyDelivery(applyDelivery(s, second(1)), second(2));
    expect(chaseStatus(mid)).toEqual({ runsNeeded: 4, ballsRemaining: 4, requiredRunRate: 6 });
  });
});

describe('matchResult', () => {
  it('is undecided mid-chase and during innings 0', () => {
    expect(matchResult(createMatch(makeConfig())).decided).toBe(false);
    expect(matchResult(applyDelivery(chaseStart(), second(1))).decided).toBe(false);
  });
  it('chasing side wins by wickets when target reached', () => {
    const s = play(chaseStart(), second(4), 2);
    expect(matchResult(s)).toEqual({ decided: true, winner: 'B', margin: 'by 1 wickets' });
    expect(needsSuperOver(s)).toBe(false);
  });
  it('first side wins by runs when chase falls short', () => {
    const s = play(chaseStart(), second(0), 3);
    const end = play(s, second(1), 3);
    expect(matchResult(end)).toEqual({ decided: true, winner: 'A', margin: 'by 3 runs' });
  });
  it('first side wins when chasers are all out short', () => {
    const s = applyDelivery(chaseStart(), { ...second(0), wicket: { type: 'bowled', outPlayerId: 'b1' } });
    expect(matchResult(s)).toEqual({ decided: true, winner: 'A', margin: 'by 6 runs' });
  });
  it('level scores tie and need a super over', () => {
    const s = play(chaseStart(), second(1), 6);
    expect(matchResult(s)).toEqual({ decided: true, tie: true });
    expect(needsSuperOver(s)).toBe(true);
  });
});
