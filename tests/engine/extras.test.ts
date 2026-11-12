import {
  createMatch,
  applyDelivery,
  legalBallsInCurrentOver,
  onStrikeId,
  isFreeHit,
  teamExtras,
  batterRuns,
  bowlerConceded,
  teamTotal,
  MatchConfig,
  MatchState,
  DeliveryInput,
} from '../../src/engine';

function makeConfig(byesEnabled = true): MatchConfig {
  return {
    id: 'm1',
    teamA: { id: 'A', name: 'Team A', color: '#f00', players: [{ playerId: 'a1', isShared: false }, { playerId: 'a2', isShared: false }] },
    teamB: { id: 'B', name: 'Team B', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' },
    },
    rules: { oversPerInnings: 5, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled },
    battingFirst: 'A',
  };
}

function d(over: Partial<DeliveryInput> = {}): DeliveryInput {
  return { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runsBat: 0, ...over };
}

const start = (byes = true): MatchState => createMatch(makeConfig(byes));

describe('wides', () => {
  it('wide of 0 adds 1, is not legal, bowler conceded +1', () => {
    const s = applyDelivery(start(), d({ extra: { type: 'wide', runs: 0 } }));
    expect(s.events[0].legal).toBe(false);
    expect(teamTotal(s, 0)).toBe(1);
    expect(legalBallsInCurrentOver(s)).toBe(0);
    expect(bowlerConceded(s, 'b1')).toBe(1);
    expect(onStrikeId(s)).toBe('a1');
  });

  it('wide with 2 run adds 3 and does not rotate; with 1 run rotates', () => {
    const s2 = applyDelivery(start(), d({ extra: { type: 'wide', runs: 2 } }));
    expect(teamTotal(s2, 0)).toBe(3);
    expect(bowlerConceded(s2, 'b1')).toBe(3);
    expect(onStrikeId(s2)).toBe('a1');
    const s1 = applyDelivery(start(), d({ extra: { type: 'wide', runs: 1 } }));
    expect(teamTotal(s1, 0)).toBe(2);
    expect(onStrikeId(s1)).toBe('a2');
  });

  it('wide + runout is kept; wide + bowled is ignored', () => {
    const ro = applyDelivery(start(), d({ extra: { type: 'wide', runs: 0 }, wicket: { type: 'runout', outPlayerId: 'a2' } }));
    expect(ro.events[0].wicket?.type).toBe('runout');
    const st = applyDelivery(start(), d({ extra: { type: 'wide', runs: 0 }, wicket: { type: 'stumped', outPlayerId: 'a1' } }));
    expect(st.events[0].wicket?.type).toBe('stumped');
    const bw = applyDelivery(start(), d({ extra: { type: 'wide', runs: 0 }, wicket: { type: 'bowled', outPlayerId: 'a1' } }));
    expect(bw.events[0].wicket).toBeUndefined();
  });
});

describe('no-balls and free hit', () => {
  it('no-ball with 4 off the bat: team +5, striker 4, not legal, free hit next', () => {
    let s = applyDelivery(start(), d({ runsBat: 4, extra: { type: 'noball', runs: 0 } }));
    expect(teamTotal(s, 0)).toBe(5);
    expect(batterRuns(s, 'a1')).toBe(4);
    expect(bowlerConceded(s, 'b1')).toBe(5);
    expect(s.events[0].legal).toBe(false);
    expect(s.events[0].freeHit).toBe(false);
    expect(legalBallsInCurrentOver(s)).toBe(0);
    expect(isFreeHit(s)).toBe(true);
    s = applyDelivery(s, d());
    expect(s.events[1].freeHit).toBe(true);
    expect(s.events[1].legal).toBe(true);
    expect(isFreeHit(s)).toBe(false);
    s = applyDelivery(s, d());
    expect(s.events[2].freeHit).toBe(false);
  });

  it('no-ball strike rotates iff bat runs are odd', () => {
    expect(onStrikeId(applyDelivery(start(), d({ runsBat: 1, extra: { type: 'noball', runs: 0 } })))).toBe('a2');
    expect(onStrikeId(applyDelivery(start(), d({ runsBat: 2, extra: { type: 'noball', runs: 0 } })))).toBe('a1');
  });

  it('no free hit when rule is off', () => {
    const cfg = makeConfig();
    const s = applyDelivery(createMatch({ ...cfg, rules: { ...cfg.rules, freeHitOnNoBall: false } }), d({ extra: { type: 'noball', runs: 0 } }));
    expect(isFreeHit(s)).toBe(false);
  });

  it('free hit persists through a wide', () => {
    let s = applyDelivery(start(), d({ extra: { type: 'noball', runs: 0 } }));
    s = applyDelivery(s, d({ extra: { type: 'wide', runs: 0 } }));
    expect(isFreeHit(s)).toBe(true);
  });

  it('on a free hit, bowled is ignored but runs count; runout is allowed', () => {
    let s = applyDelivery(start(), d({ extra: { type: 'noball', runs: 0 } }));
    s = applyDelivery(s, d({ runsBat: 2, wicket: { type: 'bowled', outPlayerId: 'a1' } }));
    expect(s.events[1].wicket).toBeUndefined();
    expect(batterRuns(s, 'a1')).toBe(2);
    expect(teamTotal(s, 0)).toBe(3);

    let r = applyDelivery(start(), d({ extra: { type: 'noball', runs: 0 } }));
    r = applyDelivery(r, d({ runsBat: 1, wicket: { type: 'runout', outPlayerId: 'a2' } }));
    expect(r.events[1].wicket?.type).toBe('runout');
  });

  it('bowled on a normal ball is kept', () => {
    const s = applyDelivery(start(), d({ wicket: { type: 'bowled', outPlayerId: 'a1' } }));
    expect(s.events[0].wicket?.type).toBe('bowled');
  });
});

describe('byes and leg-byes', () => {
  it('bye of 2: legal, to byes, not striker/bowler, no rotation', () => {
    const s = applyDelivery(start(), d({ extra: { type: 'bye', runs: 2 } }));
    expect(s.events[0].legal).toBe(true);
    expect(legalBallsInCurrentOver(s)).toBe(1);
    expect(teamTotal(s, 0)).toBe(2);
    expect(teamExtras(s, 0).byes).toBe(2);
    expect(batterRuns(s, 'a1')).toBe(0);
    expect(bowlerConceded(s, 'b1')).toBe(0);
    expect(onStrikeId(s)).toBe('a1');
  });

  it('leg-bye of 1 rotates strike and goes to legByes', () => {
    const s = applyDelivery(start(), d({ extra: { type: 'legbye', runs: 1 } }));
    expect(s.events[0].legal).toBe(true);
    expect(teamExtras(s, 0).legByes).toBe(1);
    expect(batterRuns(s, 'a1')).toBe(0);
    expect(bowlerConceded(s, 'b1')).toBe(0);
    expect(onStrikeId(s)).toBe('a2');
  });

  it('rejects byes when disabled', () => {
    expect(() => applyDelivery(start(false), d({ extra: { type: 'bye', runs: 1 } }))).toThrow();
    expect(() => applyDelivery(start(false), d({ extra: { type: 'legbye', runs: 1 } }))).toThrow();
  });
});

describe('teamExtras', () => {
  it('components sum to total', () => {
    let s = start();
    s = applyDelivery(s, d({ extra: { type: 'wide', runs: 1 } })); // 2
    s = applyDelivery(s, d({ runsBat: 0, extra: { type: 'noball', runs: 0 } })); // 1
    s = applyDelivery(s, d({ extra: { type: 'bye', runs: 3 } })); // 3
    s = applyDelivery(s, d({ extra: { type: 'legbye', runs: 2 } })); // 2
    s = applyDelivery(s, d({ runsBat: 4 })); // not extra
    expect(teamExtras(s, 0)).toEqual({ wides: 2, noBalls: 1, byes: 3, legByes: 2, total: 8 });
    expect(teamTotal(s, 0)).toBe(12);
  });

  it('is zero for an empty innings', () => {
    expect(teamExtras(start(), 1)).toEqual({ wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 });
  });
});
