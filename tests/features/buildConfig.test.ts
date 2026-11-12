import { buildConfig, validateSetup, isValid, type SetupInput } from '../../src/features/setup/buildConfig';

let mockN = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `id-${++mockN}` }));

const base = (): SetupInput => ({
  teamA: { name: ' Lions ', color: '#111111', players: ['Asha', 'Bo'] },
  teamB: { name: 'Tigers', color: '#222222', players: ['Cy', 'Di'] },
  shared: ['Sam'],
  rules: {
    overs: 10,
    wideRuns: 1,
    noBallRuns: 2,
    freeHitOnNoBall: true,
    lastManStands: true,
    byesEnabled: false,
    maxOversPerBowler: 2,
  },
  toss: { winner: 'B', choice: 'bowl' },
});

describe('buildConfig', () => {
  it('assembles teams, players, rules and battingFirst', () => {
    const c = buildConfig(base());
    expect(c.teamA.name).toBe('Lions');
    expect(c.teamB.name).toBe('Tigers');
    expect(c.teamA.color).toBe('#111111');
    expect(Object.keys(c.players)).toHaveLength(5);
    expect(c.rules).toEqual({
      oversPerInnings: 10,
      wideRuns: 1,
      noBallRuns: 2,
      freeHitOnNoBall: true,
      lastManStands: true,
      byesEnabled: false,
      maxOversPerBowler: 2,
    });
    // B won toss and chose to bowl -> A bats first
    expect(c.battingFirst).toBe('A');
  });

  it('battingFirst follows winner when choosing to bat', () => {
    const i = base();
    i.toss = { winner: 'B', choice: 'bat' };
    expect(buildConfig(i).battingFirst).toBe('B');
  });

  it('omits maxOversPerBowler when 0', () => {
    const i = base();
    i.rules.maxOversPerBowler = 0;
    expect(buildConfig(i).rules.maxOversPerBowler).toBeUndefined();
  });

  it('shared player appears in both squads with the same id and isShared', () => {
    const c = buildConfig(base());
    const a = c.teamA.players.filter((p) => p.isShared);
    const b = c.teamB.players.filter((p) => p.isShared);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].playerId).toBe(b[0].playerId);
    expect(c.players[a[0].playerId].name).toBe('Sam');
    expect(c.teamA.players).toHaveLength(3);
    expect(c.teamB.players).toHaveLength(3);
    expect(c.teamA.players.filter((p) => !p.isShared).every((p) => !p.isShared)).toBe(true);
  });

  it('assigns unique ids', () => {
    const c = buildConfig(base());
    const ids = [c.id, c.teamA.id, c.teamB.id, ...Object.keys(c.players)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validateSetup', () => {
  it('accepts valid input', () => {
    expect(isValid(validateSetup(base()))).toBe(true);
  });
  it('flags empty names, duplicates, small squads and overs', () => {
    const i = base();
    i.teamA.name = '  ';
    i.teamB.players = ['Cy', 'cy '];
    i.shared = [];
    i.teamA.players = ['Solo'];
    i.rules.overs = 0;
    const e = validateSetup(i);
    expect(e.teamA).toEqual(expect.arrayContaining(['teamNameEmpty', 'squadTooSmall']));
    expect(e.teamB).toContain('duplicatePlayer');
    expect(e.rules).toContain('oversInvalid');
  });
  it('shared player counts toward both squads', () => {
    const i = base();
    i.teamA.players = [];
    i.teamB.players = [];
    i.shared = ['X', 'Y'];
    expect(isValid(validateSetup(i))).toBe(true);
  });
});
