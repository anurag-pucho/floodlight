import {
  createMatch, applyDelivery, undo, redo, editBall, replayTo,
  onStrikeId, legalBallsInCurrentOver, isFreeHit, wicketsDown, currentInningsIndex,
  teamTotal, batsmenAtCrease, MatchConfig, MatchState, DeliveryInput,
} from '../../src/engine';

function makeConfig(overs = 5): MatchConfig {
  return {
    id: 'm1',
    teamA: { id: 'A', name: 'Team A', color: '#f00', players: [{ playerId: 'a1', isShared: false }, { playerId: 'a2', isShared: false }, { playerId: 'a3', isShared: false }] },
    teamB: { id: 'B', name: 'Team B', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }, { playerId: 'b3', isShared: false }] },
    players: {
      a1: { id: 'a1', name: 'A1' }, a2: { id: 'a2', name: 'A2' }, a3: { id: 'a3', name: 'A3' },
      b1: { id: 'b1', name: 'B1' }, b2: { id: 'b2', name: 'B2' }, b3: { id: 'b3', name: 'B3' },
    },
    rules: { oversPerInnings: overs, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}

const ball = (runsBat: number, strikerId = 'a1', nonStrikerId = 'a2'): DeliveryInput => ({
  strikerId, nonStrikerId, bowlerId: 'b1', runsBat,
});

function play(state: MatchState, runs: number[]): MatchState {
  let s = state;
  for (const r of runs) {
    const striker = s.events.length === 0 ? 'a1' : onStrikeId(s);
    const non = striker === 'a1' ? 'a2' : 'a1';
    s = applyDelivery(s, ball(r, striker, non));
  }
  return s;
}

describe('undo / redo', () => {
  it('undo after a normal ball restores prior state and redo re-applies identically', () => {
    const s1 = play(createMatch(makeConfig()), [1, 2]);
    const s2 = applyDelivery(s1, ball(1, onStrikeId(s1), 'a2'));
    const u = undo(s2);
    expect(u.events).toEqual(s1.events);
    expect(onStrikeId(u)).toBe(onStrikeId(s1));
    expect(legalBallsInCurrentOver(u)).toBe(2);
    expect(u.redo).toHaveLength(1);
    const r = redo(u);
    expect(r.events).toEqual(s2.events);
    expect(r.redo).toHaveLength(0);
  });

  it('undo with nothing to undo / redo with nothing to redo is a no-op', () => {
    const s = createMatch(makeConfig());
    expect(undo(s)).toEqual(s);
    expect(redo(s)).toEqual(s);
  });

  it('undo across an over boundary restores crease', () => {
    const s5 = play(createMatch(makeConfig()), [0, 0, 0, 0, 0]);
    const s6 = play(s5, [0]);
    expect(legalBallsInCurrentOver(s6)).toBe(0);
    const u = undo(s6);
    expect(legalBallsInCurrentOver(u)).toBe(5);
    expect(batsmenAtCrease(u)).toEqual(batsmenAtCrease(s5));
  });

  it('undo across a wicket and free hit restores state', () => {
    let s = play(createMatch(makeConfig()), [1]);
    const nb = applyDelivery(s, { ...ball(0, onStrikeId(s), 'a1' === onStrikeId(s) ? 'a2' : 'a1'), extra: { type: 'noball', runs: 0 } });
    expect(isFreeHit(nb)).toBe(true);
    const striker = onStrikeId(nb);
    const non = striker === 'a1' ? 'a2' : 'a1';
    const afterFh = applyDelivery(nb, ball(0, striker, non));
    expect(isFreeHit(afterFh)).toBe(false);
    expect(isFreeHit(undo(afterFh))).toBe(true);
    const w = applyDelivery(afterFh, { ...ball(0, striker, non), wicket: { type: 'bowled', outPlayerId: striker } });
    expect(wicketsDown(w, 0)).toBe(1);
    const u = undo(w);
    expect(wicketsDown(u, 0)).toBe(0);
    expect(batsmenAtCrease(u)).toEqual(batsmenAtCrease(afterFh));
  });

  it('undo of the first ball of innings 1 returns to innings-0-complete state', () => {
    let s = createMatch(makeConfig(1));
    s = play(s, [1, 1, 1, 1, 1, 1]);
    expect(currentInningsIndex(s)).toBe(1);
    const first = applyDelivery(s, { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a1', runsBat: 1 });
    expect(first.events[first.events.length - 1].inningsIndex).toBe(1);
    const u = undo(first);
    expect(u.events).toEqual(s.events);
    expect(currentInningsIndex(u)).toBe(1); // gap: innings 0 complete, chase pending
    const u2 = undo(u);
    expect(currentInningsIndex(u2)).toBe(0);
    expect(redo(redo(u2)).events).toEqual(first.events);
  });
});

describe('ball ids', () => {
  it('are unique and stable across undo + redo + new ball', () => {
    let s = play(createMatch(makeConfig()), [1, 2, 3]);
    const ids = s.events.map(e => e.id);
    s = redo(undo(s));
    expect(s.events.map(e => e.id)).toEqual(ids);
    const u = undo(s);
    const fresh = play(u, [4]);
    const all = [...fresh.events.map(e => e.id), ...u.redo.map(e => e.id)];
    expect(new Set(all).size).toBe(all.length);
    const lastId = fresh.events[fresh.events.length - 1].id;
    expect(ids).not.toContain(lastId);
  });
});

describe('editBall', () => {
  it('turning a 1 into a wide re-numbers later balls and shifts the over boundary', () => {
    const s = play(createMatch(makeConfig()), [1, 0, 0, 0, 0, 0, 0]); // 7 balls: over 0 full, 1 in over 1
    const target = s.events[0];
    const e = editBall(s, target.id, { ...ball(0), extra: { type: 'wide', runs: 0 } });
    expect(e.events[0].legal).toBe(false);
    expect(e.events[0].id).toBe(target.id);
    // 6 legal balls remain in total... over 0 now holds legal balls from events 1..6
    const last = e.events[e.events.length - 1];
    expect(last.overNumber).toBe(0);
    expect(last.ballInOver).toBe(6);
    expect(legalBallsInCurrentOver(e)).toBe(0);
    expect(teamTotal(e, 0)).toBe(1);
    expect(e.events.map(x => x.id)).toEqual(s.events.map(x => x.id));
    expect(e.redo).toEqual([]);
  });

  it('throws for an unknown ball id and clears redo', () => {
    const s = undo(play(createMatch(makeConfig()), [1, 1]));
    expect(() => editBall(s, 'nope', ball(1))).toThrow();
    const e = editBall(s, s.events[0].id, ball(4));
    expect(e.redo).toEqual([]);
    expect(teamTotal(e, 0)).toBe(4);
  });
});

describe('replayTo', () => {
  it('equals the first k events and does not mutate the source', () => {
    const s = play(createMatch(makeConfig()), [1, 2, 3, 4]);
    const snapshot = JSON.stringify(s);
    const v = replayTo(s, 2);
    expect(v.events).toEqual(s.events.slice(0, 2));
    expect(teamTotal(v, 0)).toBe(3);
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(replayTo(s, 99).events).toHaveLength(4);
    expect(replayTo(s, -1).events).toHaveLength(0);
  });
});
