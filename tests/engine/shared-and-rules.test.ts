import {
  createMatch,
  applyDelivery,
  startNextInnings,
  dismissedIds,
  batterRuns,
  bowlerConceded,
  bowlerWickets,
  bowlerOversBowled,
  teamExtras,
  teamTotal,
  MatchConfig,
  MatchRules,
  MatchState,
  DeliveryInput,
} from '../../src/engine';

function makeConfig(rules: Partial<MatchRules> = {}): MatchConfig {
  return {
    id: 'm1',
    teamA: {
      id: 'A', name: 'Team A', color: '#f00',
      players: [{ playerId: 'a1', isShared: false }, { playerId: 'shared1', isShared: true }, { playerId: 'a3', isShared: false }],
    },
    teamB: {
      id: 'B', name: 'Team B', color: '#00f',
      players: [{ playerId: 'b1', isShared: false }, { playerId: 'shared1', isShared: true }, { playerId: 'b3', isShared: false }],
    },
    players: {
      a1: { id: 'a1', name: 'A1' }, a3: { id: 'a3', name: 'A3' },
      b1: { id: 'b1', name: 'B1' }, b3: { id: 'b3', name: 'B3' },
      shared1: { id: 'shared1', name: 'Shared' },
    },
    rules: { oversPerInnings: 1, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true, ...rules },
    battingFirst: 'A',
  };
}

function play(s: MatchState, d: DeliveryInput, n = 1): MatchState {
  let out = s;
  for (let i = 0; i < n; i++) out = applyDelivery(out, d);
  return out;
}

describe('shared player: dismissal and batting are per-innings', () => {
  it('dismissed in innings 0, not out and scoring in innings 1', () => {
    let s = createMatch(makeConfig());
    s = applyDelivery(s, {
      strikerId: 'shared1', nonStrikerId: 'a1', bowlerId: 'b1', runsBat: 1,
      wicket: { type: 'bowled', outPlayerId: 'shared1' },
    });
    // fill the over so innings 0 completes
    s = play(s, { strikerId: 'a3', nonStrikerId: 'a1', bowlerId: 'b1', runsBat: 0 }, 5);
    s = startNextInnings(s);
    expect(dismissedIds(s, 0).has('shared1')).toBe(true);
    expect(dismissedIds(s, 1).has('shared1')).toBe(false);

    s = applyDelivery(s, { strikerId: 'shared1', nonStrikerId: 'b1', bowlerId: 'a1', runsBat: 4 });
    expect(dismissedIds(s, 1).has('shared1')).toBe(false);
    expect(dismissedIds(s, 0).has('shared1')).toBe(true);
    expect(batterRuns(s, 'shared1', 1)).toBe(4);
    expect(batterRuns(s, 'shared1', 0)).toBe(1);
    expect(teamTotal(s, 1)).toBe(4);
  });
});

describe('shared player: bowling figures are per-innings', () => {
  it('innings-0 batting does not affect innings-1 bowling', () => {
    let s = createMatch(makeConfig());
    s = applyDelivery(s, { strikerId: 'shared1', nonStrikerId: 'a1', bowlerId: 'b1', runsBat: 3 });
    s = play(s, { strikerId: 'a1', nonStrikerId: 'a3', bowlerId: 'b1', runsBat: 0 }, 5);
    s = startNextInnings(s);
    s = applyDelivery(s, { strikerId: 'b1', nonStrikerId: 'b3', bowlerId: 'shared1', runsBat: 2 });
    s = applyDelivery(s, { strikerId: 'b1', nonStrikerId: 'b3', bowlerId: 'shared1', runsBat: 0, wicket: { type: 'bowled', outPlayerId: 'b1' } });

    expect(bowlerConceded(s, 'shared1')).toBe(2);
    expect(bowlerConceded(s, 'shared1', 1)).toBe(2);
    expect(bowlerConceded(s, 'shared1', 0)).toBe(0);
    expect(bowlerWickets(s, 'shared1')).toBe(1);
    expect(bowlerWickets(s, 'shared1', 0)).toBe(0);
    expect(batterRuns(s, 'shared1')).toBe(3);
    expect(bowlerOversBowled(s, 'shared1', 0)).toBe(0);
    expect(bowlerOversBowled(s, 'shared1', 1)).toBe(0);
  });
});

describe('custom rule values', () => {
  it('wideRuns:2 and noBallRuns:2 change extras and total', () => {
    let s = createMatch(makeConfig({ wideRuns: 2, noBallRuns: 2 }));
    s = applyDelivery(s, { strikerId: 'a1', nonStrikerId: 'a3', bowlerId: 'b1', runsBat: 0, extra: { type: 'wide', runs: 0 } });
    s = applyDelivery(s, { strikerId: 'a1', nonStrikerId: 'a3', bowlerId: 'b1', runsBat: 1, extra: { type: 'noball', runs: 0 } });
    const ex = teamExtras(s, 0);
    expect(ex.wides).toBe(2);
    expect(ex.noBalls).toBe(2);
    expect(ex.total).toBe(4);
    expect(teamTotal(s, 0)).toBe(5);
    expect(bowlerConceded(s, 'b1')).toBe(5);
  });
});

describe('bowlerOversBowled', () => {
  const ball = (bowlerId: string): DeliveryInput => ({ strikerId: 'a1', nonStrikerId: 'a3', bowlerId, runsBat: 0 });

  it('counts completed overs from legal balls only', () => {
    let s = createMatch(makeConfig({ oversPerInnings: 5 }));
    s = play(s, ball('b1'), 6);
    expect(bowlerOversBowled(s, 'b1', 0)).toBe(1);
    s = play(s, ball('b3'), 6);
    s = play(s, ball('b1'), 3);
    expect(bowlerOversBowled(s, 'b1', 0)).toBe(1);
    expect(bowlerOversBowled(s, 'b3', 0)).toBe(1);
    s = applyDelivery(s, { ...ball('b1'), extra: { type: 'wide', runs: 0 } });
    expect(bowlerOversBowled(s, 'b1', 0)).toBe(1);
    s = play(s, ball('b1'), 3);
    expect(bowlerOversBowled(s, 'b1', 0)).toBe(2);
    expect(bowlerOversBowled(s, 'b1', 1)).toBe(0);
  });
});
