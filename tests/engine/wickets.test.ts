import {
  createMatch,
  applyDelivery,
  wicketsDown,
  isInningsComplete,
  fallOfWickets,
  batsmenAtCrease,
  dismissedIds,
  battingSquadSize,
  bowlerWickets,
  teamTotal,
  batterRuns,
  MatchConfig,
  MatchState,
  DeliveryInput,
  WicketType,
} from '../../src/engine';

function makeConfig(lastManStands = false, overs = 5): MatchConfig {
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
    rules: { oversPerInnings: overs, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands, byesEnabled: true },
    battingFirst: 'A',
  };
}

function d(over: Partial<DeliveryInput> = {}): DeliveryInput {
  return { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runsBat: 0, ...over };
}

const start = (lms = false, overs = 5): MatchState => createMatch(makeConfig(lms, overs));

describe('wicket types', () => {
  const bowlerTypes: WicketType[] = ['bowled', 'lbw', 'caught', 'stumped', 'hitwicket'];
  it.each(bowlerTypes)('%s records a dismissal and credits the bowler', t => {
    const s = applyDelivery(start(), d({ wicket: { type: t, outPlayerId: 'a1' } }));
    expect(wicketsDown(s, 0)).toBe(1);
    expect(dismissedIds(s, 0).has('a1')).toBe(true);
    expect(bowlerWickets(s, 'b1', 0)).toBe(1);
  });
  it('runout records a dismissal but does not credit the bowler', () => {
    const s = applyDelivery(start(), d({ wicket: { type: 'runout', outPlayerId: 'a2' } }));
    expect(wicketsDown(s, 0)).toBe(1);
    expect(dismissedIds(s, 0).has('a2')).toBe(true);
    expect(bowlerWickets(s, 'b1', 0)).toBe(0);
  });
  it('runout with bat runs and byes completed still counts those runs', () => {
    const s1 = applyDelivery(start(), d({ runsBat: 1, wicket: { type: 'runout', outPlayerId: 'a2' } }));
    expect(teamTotal(s1, 0)).toBe(1);
    expect(batterRuns(s1, 'a1', 0)).toBe(1);
    const s2 = applyDelivery(start(), d({ extra: { type: 'bye', runs: 2 }, wicket: { type: 'runout', outPlayerId: 'a1' } }));
    expect(teamTotal(s2, 0)).toBe(2);
    expect(wicketsDown(s2, 0)).toBe(1);
  });
  it('bowled on a free hit is ignored', () => {
    let s = applyDelivery(start(), d({ extra: { type: 'noball', runs: 0 } }));
    s = applyDelivery(s, d({ wicket: { type: 'bowled', outPlayerId: 'a1' } }));
    expect(wicketsDown(s, 0)).toBe(0);
  });
});

describe('batsmenAtCrease', () => {
  it('reflects the replacement supplied on the next delivery', () => {
    let s = applyDelivery(start(), d({ wicket: { type: 'bowled', outPlayerId: 'a1' } }));
    expect(batsmenAtCrease(s)).toEqual({ strikerId: '', nonStrikerId: 'a2' });
    s = applyDelivery(s, d({ strikerId: 'a3', nonStrikerId: 'a2' }));
    expect(batsmenAtCrease(s)).toEqual({ strikerId: 'a3', nonStrikerId: 'a2' });
  });
  it('rotates on odd runs after the replacement', () => {
    let s = applyDelivery(start(), d({ wicket: { type: 'bowled', outPlayerId: 'a1' } }));
    s = applyDelivery(s, d({ strikerId: 'a3', nonStrikerId: 'a2', runsBat: 1 }));
    expect(batsmenAtCrease(s)).toEqual({ strikerId: 'a2', nonStrikerId: 'a3' });
  });
});

describe('fallOfWickets', () => {
  it('captures running score and over string', () => {
    let s = start();
    s = applyDelivery(s, d({ runsBat: 4 }));
    s = applyDelivery(s, d({ runsBat: 0, strikerId: 'a1', nonStrikerId: 'a2' }));
    s = applyDelivery(s, d({ extra: { type: 'wide', runs: 0 } }));
    s = applyDelivery(s, d({ wicket: { type: 'caught', outPlayerId: 'a1' } }));
    s = applyDelivery(s, d({ strikerId: 'a3', nonStrikerId: 'a2', runsBat: 2 }));
    s = applyDelivery(s, d({ strikerId: 'a3', nonStrikerId: 'a2', wicket: { type: 'lbw', outPlayerId: 'a2' } }));
    const fow = fallOfWickets(s, 0);
    expect(fow).toEqual([
      { wicketNo: 1, score: 5, over: '0.3', outPlayerId: 'a1' },
      { wicketNo: 2, score: 7, over: '0.5', outPlayerId: 'a2' },
    ]);
  });
});

describe('all-out and last man stands', () => {
  const twoWickets = (s: MatchState): MatchState => {
    s = applyDelivery(s, d({ wicket: { type: 'bowled', outPlayerId: 'a1' } }));
    return applyDelivery(s, d({ strikerId: 'a3', nonStrikerId: 'a2', wicket: { type: 'bowled', outPlayerId: 'a2' } }));
  };
  it('battingSquadSize is the batting side size', () => {
    expect(battingSquadSize(start(), 0)).toBe(3);
    expect(battingSquadSize(start(), 1)).toBe(2);
  });
  it('LMS off: 3-player side all out at 2 wickets', () => {
    const s = twoWickets(start(false));
    expect(wicketsDown(s, 0)).toBe(2);
    expect(isInningsComplete(s)).toBe(true);
  });
  it('LMS on: continues until 3 wickets', () => {
    let s = twoWickets(start(true));
    expect(isInningsComplete(s)).toBe(false);
    s = applyDelivery(s, d({ strikerId: 'a3', nonStrikerId: '', wicket: { type: 'bowled', outPlayerId: 'a3' } }));
    expect(wicketsDown(s, 0)).toBe(3);
    expect(isInningsComplete(s)).toBe(true);
  });
  it('overs exhausted completes the innings', () => {
    let s = start(false, 1);
    for (let i = 0; i < 5; i++) s = applyDelivery(s, d());
    expect(isInningsComplete(s)).toBe(false);
    s = applyDelivery(s, d());
    expect(isInningsComplete(s)).toBe(true);
    expect(wicketsDown(s, 0)).toBe(0);
  });
});
