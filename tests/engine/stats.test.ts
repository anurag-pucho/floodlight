import {
  createMatch,
  applyDelivery,
  battingCard,
  bowlingCard,
  partnerships,
  manhattan,
  worm,
  runRate,
  teamTotal,
  MatchConfig,
  MatchState,
  DeliveryInput,
} from '../../src/engine';

function makeConfig(): MatchConfig {
  const ids = ['a1', 'a2', 'a3', 'a4', 'a5'];
  return {
    id: 'm1',
    teamA: { id: 'A', name: 'Team A', color: '#f00', players: ids.map(playerId => ({ playerId, isShared: false })) },
    teamB: { id: 'B', name: 'Team B', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' }, a3: { id: 'a3', name: 'A3' },
      a4: { id: 'a4', name: 'A4' }, a5: { id: 'a5', name: 'A5' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' },
    },
    rules: { oversPerInnings: 5, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}

const D = (strikerId: string, nonStrikerId: string, bowlerId: string, runsBat: number, rest: Partial<DeliveryInput> = {}): DeliveryInput =>
  ({ strikerId, nonStrikerId, bowlerId, runsBat, ...rest });

// Fixed script: 27 legal balls, team total 45, 2 wickets.
const SCRIPT: DeliveryInput[] = [
  // Over 0 (b1): 15 runs, not a maiden
  D('a1', 'a2', 'b1', 4),
  D('a1', 'a2', 'b1', 1),
  D('a2', 'a1', 'b1', 0, { extra: { type: 'wide', runs: 0 } }),
  D('a2', 'a1', 'b1', 2),
  D('a2', 'a1', 'b1', 4, { extra: { type: 'noball', runs: 0 } }),
  D('a2', 'a1', 'b1', 0, { extra: { type: 'bye', runs: 1 } }),
  D('a1', 'a2', 'b1', 0),
  D('a1', 'a2', 'b1', 1),
  // Over 1 (b2): maiden (leg-bye does not break it)
  D('a1', 'a2', 'b2', 0),
  D('a1', 'a2', 'b2', 0),
  D('a1', 'a2', 'b2', 0, { extra: { type: 'legbye', runs: 1 } }),
  D('a2', 'a1', 'b2', 0),
  D('a2', 'a1', 'b2', 0),
  D('a2', 'a1', 'b2', 0),
  // Over 2 (b1): six, wicket (a1 caught by b2), then a3
  D('a1', 'a2', 'b1', 6),
  D('a1', 'a2', 'b1', 0, { wicket: { type: 'caught', outPlayerId: 'a1', fielderId: 'b2' } }),
  D('a3', 'a2', 'b1', 1),
  D('a2', 'a3', 'b1', 4),
  D('a2', 'a3', 'b1', 2),
  D('a2', 'a3', 'b1', 0),
  // Over 3 (b2): six, wide+1, wicket (a3 bowled), then a4
  D('a3', 'a2', 'b2', 0),
  D('a3', 'a2', 'b2', 6),
  D('a3', 'a2', 'b2', 0, { extra: { type: 'wide', runs: 1 } }),
  D('a2', 'a3', 'b2', 1),
  D('a3', 'a2', 'b2', 0, { wicket: { type: 'bowled', outPlayerId: 'a3' } }),
  D('a4', 'a2', 'b2', 4),
  D('a4', 'a2', 'b2', 0),
  // Over 4 (b1): partial, 3 balls
  D('a2', 'a4', 'b1', 1),
  D('a4', 'a2', 'b1', 2),
  D('a4', 'a2', 'b1', 0),
];

const build = (): MatchState => SCRIPT.reduce(applyDelivery, createMatch(makeConfig()));

describe('derived stats on a fixed scripted innings', () => {
  const s = build();

  it('script totals 45', () => {
    expect(teamTotal(s, 0)).toBe(45);
  });

  it('battingCard', () => {
    const card = battingCard(s, 0);
    expect(card.map(r => r.playerId)).toEqual(['a1', 'a2', 'a3', 'a4']);
    const [a1, a2, a3, a4] = card;
    expect(a1).toMatchObject({ runs: 12, balls: 9, fours: 1, sixes: 1, out: true, dismissal: 'c B2 b B1' });
    expect(a1.strikeRate).toBeCloseTo((12 / 9) * 100, 5);
    // a2: wide excluded, no-ball faced included, bye ball included
    expect(a2).toMatchObject({ runs: 14, balls: 11, fours: 2, sixes: 0, out: false });
    expect(a2.dismissal).toBeUndefined();
    expect(a2.strikeRate).toBeCloseTo((14 / 11) * 100, 5);
    expect(a3).toMatchObject({ runs: 7, balls: 4, fours: 0, sixes: 1, out: true, dismissal: 'b B2' });
    expect(a3.strikeRate).toBeCloseTo(175, 5);
    expect(a4).toMatchObject({ runs: 6, balls: 4, fours: 1, sixes: 0, out: false });
    expect(a4.strikeRate).toBeCloseTo(150, 5);
  });

  it('strike rate is 0 when no balls faced', () => {
    const none = applyDelivery(createMatch(makeConfig()), D('a1', 'a2', 'b1', 0, { extra: { type: 'wide', runs: 0 } }));
    const rows = battingCard(none, 0);
    expect(rows.map(r => r.playerId)).toEqual(['a1', 'a2']);
    expect(rows[0]).toMatchObject({ runs: 0, balls: 0, strikeRate: 0, out: false });
  });

  it('bowlingCard', () => {
    const card = bowlingCard(s, 0);
    expect(card.map(r => r.playerId)).toEqual(['b1', 'b2']);
    const [b1, b2] = card;
    expect(b1).toMatchObject({ overs: '2.3', maidens: 0, runs: 30, wickets: 1, dots: 5, wides: 1, noBalls: 1 });
    expect(b1.economy).toBeCloseTo(12, 5);
    expect(b2).toMatchObject({ overs: '2.0', maidens: 1, runs: 13, wickets: 1, dots: 9, wides: 1, noBalls: 0 });
    expect(b2.economy).toBeCloseTo(6.5, 5);
  });

  it('partnerships across wickets', () => {
    expect(partnerships(s, 0)).toEqual([
      { forWicket: 1, runs: 22, balls: 14, playerIds: ['a1', 'a2'] },
      { forWicket: 2, runs: 16, balls: 8, playerIds: ['a3', 'a2'] },
      { forWicket: 3, runs: 7, balls: 5, playerIds: ['a4', 'a2'] },
    ]);
  });

  it('manhattan sums to the innings total', () => {
    const m = manhattan(s, 0);
    expect(m).toEqual([
      { over: 0, runs: 15, wickets: 0 },
      { over: 1, runs: 1, wickets: 0 },
      { over: 2, runs: 13, wickets: 1 },
      { over: 3, runs: 13, wickets: 1 },
      { over: 4, runs: 3, wickets: 0 },
    ]);
    expect(m.reduce((t, o) => t + o.runs, 0)).toBe(teamTotal(s, 0));
  });

  it('worm is monotonic, one entry per legal ball, ends at the total', () => {
    const w = worm(s, 0);
    expect(w.map(p => p.ball)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(w.map(p => p.runs)).toEqual([
      4, 5, 8, 14, 14, 15,
      15, 15, 16, 16, 16, 16,
      22, 22, 23, 27, 29, 29,
      29, 35, 38, 38, 42, 42,
      43, 45, 45,
    ]);
    for (let i = 1; i < w.length; i++) expect(w[i].runs).toBeGreaterThanOrEqual(w[i - 1].runs);
    expect(w[w.length - 1].runs).toBe(teamTotal(s, 0));
  });

  it('runRate = total / overs bowled', () => {
    expect(runRate(s, 0)).toBeCloseTo(10, 5);
    expect(runRate(createMatch(makeConfig()), 0)).toBe(0);
  });
});
