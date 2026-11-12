import {
  createMatch, applyDelivery, battingCard,
  teamCaptainId, teamWicketkeeperId, battingSide, bowlingSide,
  isSharedPlayer, canSharedPlayerBowl, canSharedPlayerBat,
  MatchConfig, MatchState, DeliveryInput,
} from '../../src/engine';

function makeConfig(): MatchConfig {
  return {
    id: 'm1',
    teamA: {
      id: 'A', name: 'Team A', color: '#f00',
      players: [
        { playerId: 'a1', isShared: false, isCaptain: true },
        { playerId: 'a2', isShared: false },
        { playerId: 's1', isShared: true },
        { playerId: 'a3', isShared: false, isWicketkeeper: true },
      ],
    },
    teamB: {
      id: 'B', name: 'Team B', color: '#00f',
      players: [
        { playerId: 'b1', isShared: false },
        { playerId: 'b2', isShared: false, isCaptain: true, isWicketkeeper: true },
        { playerId: 's1', isShared: true },
        { playerId: 'b3', isShared: false },
      ],
    },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' }, a3: { id: 'a3', name: 'A3' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' }, b3: { id: 'b3', name: 'B3' },
      s1: { id: 's1', name: 'S1' },
    },
    rules: { oversPerInnings: 5, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}

const D = (strikerId: string, nonStrikerId: string, bowlerId: string, runsBat: number, rest: Partial<DeliveryInput> = {}): DeliveryInput =>
  ({ strikerId, nonStrikerId, bowlerId, runsBat, ...rest });

function play(state: MatchState, ...ds: DeliveryInput[]): MatchState {
  return ds.reduce((s, d) => applyDelivery(s, d), state);
}

describe('roles', () => {
  const cfg = makeConfig();
  it('finds captain and wicketkeeper per side', () => {
    expect(teamCaptainId(cfg, 'A')).toBe('a1');
    expect(teamCaptainId(cfg, 'B')).toBe('b2');
    expect(teamWicketkeeperId(cfg, 'A')).toBe('a3');
    expect(teamWicketkeeperId(cfg, 'B')).toBe('b2');
  });
  it('returns undefined when unmarked', () => {
    const c = makeConfig();
    c.teamA.players = c.teamA.players.map(p => ({ playerId: p.playerId, isShared: p.isShared }));
    expect(teamCaptainId(c, 'A')).toBeUndefined();
    expect(teamWicketkeeperId(c, 'A')).toBeUndefined();
  });
  it('derives batting and bowling side', () => {
    const s = createMatch(cfg);
    expect(battingSide(s, 0)).toBe('A');
    expect(bowlingSide(s, 0)).toBe('B');
    expect(battingSide(s, 1)).toBe('B');
    expect(bowlingSide(s, 1)).toBe('A');
  });
});

describe('shared player exclusivity', () => {
  it('identifies shared players', () => {
    const cfg = makeConfig();
    expect(isSharedPlayer(cfg, 's1')).toBe(true);
    expect(isSharedPlayer(cfg, 'a1')).toBe(false);
    expect(isSharedPlayer(cfg, 'nobody')).toBe(false);
  });
  it('non-shared players are never restricted', () => {
    const s = play(createMatch(makeConfig()), D('a1', 'a2', 'b1', 1));
    expect(canSharedPlayerBowl(s, 'a1', 0)).toBe(true);
    expect(canSharedPlayerBat(s, 'b1', 0)).toBe(true);
  });
  it('shared player at the crease cannot bowl', () => {
    const s = play(createMatch(makeConfig()), D('a1', 's1', 'b1', 0));
    expect(canSharedPlayerBowl(s, 's1', 0)).toBe(false);
  });
  it('shared player who faced a ball (now out) cannot bowl; one who has not can', () => {
    let s = play(createMatch(makeConfig()), D('s1', 'a1', 'b1', 0, { wicket: { type: 'bowled', outPlayerId: 's1' } }));
    expect(canSharedPlayerBowl(s, 's1', 0)).toBe(false);
    s = play(createMatch(makeConfig()), D('a1', 'a2', 'b1', 0));
    expect(canSharedPlayerBowl(s, 's1', 0)).toBe(true);
  });
  it('shared player who has bowled cannot bat', () => {
    const s = play(createMatch(makeConfig()), D('a1', 'a2', 's1', 1));
    expect(canSharedPlayerBat(s, 's1', 0)).toBe(false);
    expect(canSharedPlayerBowl(s, 's1', 0)).toBe(true);
  });
});

describe('keeper dismissals', () => {
  const base = () => createMatch(makeConfig());
  const dismissal = (s: MatchState) => battingCard(s, 0).find(r => r.out)?.dismissal;
  it('stumping by keeper gets a dagger', () => {
    const s = play(base(), D('a1', 'a2', 'b1', 0, { wicket: { type: 'stumped', outPlayerId: 'a1', fielderId: 'b2' } }));
    expect(dismissal(s)).toBe('st †B2 b B1');
  });
  it('catch by keeper gets a dagger', () => {
    const s = play(base(), D('a1', 'a2', 'b1', 0, { wicket: { type: 'caught', outPlayerId: 'a1', fielderId: 'b2' } }));
    expect(dismissal(s)).toBe('c †B2 b B1');
  });
  it('catch by non-keeper has none', () => {
    const s = play(base(), D('a1', 'a2', 'b1', 0, { wicket: { type: 'caught', outPlayerId: 'a1', fielderId: 'b3' } }));
    expect(dismissal(s)).toBe('c B3 b B1');
  });
});
