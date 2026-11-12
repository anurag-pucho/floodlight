import {
  createMatch,
  applyDelivery,
  applyRetire,
  undo,
  redo,
  replayTo,
  batsmenAtCrease,
  dismissedIds,
  retiredHurtIds,
  wicketsDown,
  isInningsComplete,
  fallOfWickets,
  battingCard,
  MatchConfig,
  MatchState,
  DeliveryInput,
} from '../../src/engine';

function makeConfig(): MatchConfig {
  return {
    id: 'm1',
    teamA: {
      id: 'A', name: 'Team A', color: '#f00',
      players: ['a1', 'a2', 'a3'].map(playerId => ({ playerId, isShared: false })),
    },
    teamB: { id: 'B', name: 'Team B', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' }, a3: { id: 'a3', name: 'A3' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' },
    },
    rules: { oversPerInnings: 5, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}
const d = (over: Partial<DeliveryInput> = {}): DeliveryInput => ({
  strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runsBat: 0, ...over,
});
const start = (): MatchState => applyDelivery(createMatch(makeConfig()), d({ runsBat: 2 }));

describe('retired hurt', () => {
  it('removes him from the crease without a wicket and lets him return', () => {
    const s = applyRetire(start(), { playerId: 'a1', out: false });
    expect(batsmenAtCrease(s)).toEqual({ strikerId: '', nonStrikerId: 'a2' });
    expect(dismissedIds(s, 0).has('a1')).toBe(false);
    expect(retiredHurtIds(s, 0).has('a1')).toBe(true);
    expect(wicketsDown(s, 0)).toBe(0);
    expect(s.events).toHaveLength(1);
    // replacement arrives on the next delivery, later a1 returns
    const s2 = applyDelivery(s, d({ strikerId: 'a3', runsBat: 1 }));
    expect(batsmenAtCrease(s2).strikerId).toBe('a2');
    expect(retiredHurtIds(s2, 0).has('a1')).toBe(true);
    const s3 = applyDelivery(s2, d({ strikerId: 'a2', nonStrikerId: 'a1', wicket: { type: 'bowled', outPlayerId: 'a2' } }));
    expect(retiredHurtIds(s3, 0).size).toBe(0);
    expect(wicketsDown(s3, 0)).toBe(1);
    expect(battingCard(s, 0).find(r => r.playerId === 'a1')?.dismissal).toBe('retired hurt');
  });
  it('does not count towards all-out', () => {
    let s = start();
    s = applyRetire(s, { playerId: 'a1', out: false });
    s = applyRetire(s, { playerId: 'a2', out: false });
    expect(isInningsComplete(s)).toBe(false);
  });
});

describe('retired out', () => {
  it('counts as a wicket and a dismissal reading "retired out"', () => {
    const s = applyRetire(start(), { playerId: 'a1', out: true });
    expect(dismissedIds(s, 0).has('a1')).toBe(true);
    expect(wicketsDown(s, 0)).toBe(1);
    expect(retiredHurtIds(s, 0).has('a1')).toBe(false);
    const row = battingCard(s, 0).find(r => r.playerId === 'a1');
    expect(row?.out).toBe(true);
    expect(row?.dismissal).toBe('retired out');
    expect(fallOfWickets(s, 0)).toEqual([{ wicketNo: 1, score: 2, over: '0.1', outPlayerId: 'a1' }]);
  });
  it('can end the innings (all out)', () => {
    let s = start();
    s = applyRetire(s, { playerId: 'a1', out: true });
    s = applyDelivery(s, d({ strikerId: 'a3' }));
    s = applyRetire(s, { playerId: 'a2', out: true });
    expect(wicketsDown(s, 0)).toBe(2);
    expect(isInningsComplete(s)).toBe(true);
  });
});

describe('guards', () => {
  it('rejects retiring someone who is not at the crease', () => {
    expect(() => applyRetire(start(), { playerId: 'a3', out: false })).toThrow();
  });
});

describe('undo / redo / replay', () => {
  it('undo of a retire restores the prior crease and redo re-applies it', () => {
    const before = start();
    const s = applyRetire(before, { playerId: 'a1', out: true });
    const u = undo(s);
    expect(batsmenAtCrease(u)).toEqual(batsmenAtCrease(before));
    expect(wicketsDown(u, 0)).toBe(0);
    expect(u.events).toHaveLength(1);
    const r = redo(u);
    expect(batsmenAtCrease(r)).toEqual({ strikerId: '', nonStrikerId: 'a2' });
    expect(wicketsDown(r, 0)).toBe(1);
  });
  it('undo pops events in chronological order across deliveries and retires', () => {
    let s = start();
    s = applyRetire(s, { playerId: 'a1', out: false });
    s = applyDelivery(s, d({ strikerId: 'a3' }));
    s = undo(s); // the delivery
    expect(s.events).toHaveLength(1);
    expect(batsmenAtCrease(s).strikerId).toBe('');
    s = undo(s); // the retire
    expect(batsmenAtCrease(s).strikerId).toBe('a1');
    s = redo(s);
    expect(batsmenAtCrease(s).strikerId).toBe('');
    s = redo(s);
    expect(s.events).toHaveLength(2);
    expect(batsmenAtCrease(s).strikerId).toBe('a3');
  });
  it('a new action clears the redo stack', () => {
    let s = applyRetire(start(), { playerId: 'a1', out: false });
    s = undo(s);
    s = applyRetire(s, { playerId: 'a2', out: true });
    expect(redo(s)).toBe(s);
  });
  it('replayTo keeps retire events at their position', () => {
    let s = start();
    s = applyRetire(s, { playerId: 'a1', out: true });
    s = applyDelivery(s, d({ strikerId: 'a3' }));
    expect(wicketsDown(replayTo(s, 1), 0)).toBe(1);
    expect(wicketsDown(replayTo(s, 0), 0)).toBe(0);
    expect(wicketsDown(replayTo(s, 2), 0)).toBe(1);
  });
});
