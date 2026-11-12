import {
  createMatch,
  applyDelivery,
  lastBallMilestones,
  undo,
  MatchConfig,
  MatchState,
  DeliveryInput,
} from '../../src/engine';

const ids = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];

function makeConfig(): MatchConfig {
  return {
    id: 'm1',
    teamA: { id: 'A', name: 'Team A', color: '#f00', players: ids.map(playerId => ({ playerId, isShared: false })) },
    teamB: { id: 'B', name: 'Team B', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
    players: Object.fromEntries([...ids, 'b1', 'b2'].map(id => [id, { id, name: id.toUpperCase() }])),
    rules: { oversPerInnings: 20, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
    battingFirst: 'A',
  };
}

const D = (strikerId: string, runsBat: number, rest: Partial<DeliveryInput> = {}): DeliveryInput =>
  ({ strikerId, nonStrikerId: 'a2', bowlerId: 'b1', runsBat, ...rest });

function play(inputs: DeliveryInput[]): MatchState {
  return inputs.reduce(applyDelivery, createMatch(makeConfig()));
}

/** Gives a1 exactly `runs` bat runs using sixes then a final remainder ball. */
function scoreUpTo(runs: number): DeliveryInput[] {
  const out: DeliveryInput[] = [];
  let left = runs;
  while (left >= 6) { out.push(D('a1', 6)); left -= 6; }
  if (left > 0) out.push(D('a1', left));
  return out;
}

const wicketBall = (outId: string): DeliveryInput =>
  D(outId, 0, { wicket: { type: 'bowled', outPlayerId: outId } });

describe('lastBallMilestones', () => {
  it('returns [] with no events', () => {
    expect(lastBallMilestones(createMatch(makeConfig()))).toEqual([]);
  });

  it('a non-milestone ball yields []', () => {
    expect(lastBallMilestones(play(scoreUpTo(10)))).toEqual([]);
  });

  it('a single taking a batter 49 to 50 yields fifty', () => {
    const s = play([...scoreUpTo(49), D('a1', 1)]);
    expect(lastBallMilestones(s)).toEqual([{ kind: 'fifty', playerId: 'a1', inningsIndex: 0 }]);
  });

  it('49 reached just before does not fire', () => {
    expect(lastBallMilestones(play(scoreUpTo(49)))).toEqual([]);
  });

  it('a boundary jumping past 50 fires fifty once', () => {
    const s = play([...scoreUpTo(48), D('a1', 4)]);
    expect(lastBallMilestones(s)).toEqual([{ kind: 'fifty', playerId: 'a1', inningsIndex: 0 }]);
  });

  it('99 to 100 yields century only', () => {
    const s = play([...scoreUpTo(99), D('a1', 1)]);
    expect(lastBallMilestones(s)).toEqual([{ kind: 'century', playerId: 'a1', inningsIndex: 0 }]);
  });

  it('a 50 reached earlier does not re-fire on later balls', () => {
    const s = play([...scoreUpTo(50), D('a1', 4)]);
    expect(lastBallMilestones(s)).toEqual([]);
  });

  it('byes and wides do not count toward a batter milestone', () => {
    const s = play([...scoreUpTo(49), D('a1', 0, { extra: { type: 'bye', runs: 1 } })]);
    expect(lastBallMilestones(s)).toEqual([]);
  });

  it('undoing the milestone ball clears it; re-scoring fires it again', () => {
    const s = play([...scoreUpTo(49), D('a1', 1)]);
    const undone = undo(s);
    expect(lastBallMilestones(undone)).toEqual([]);
    expect(lastBallMilestones(applyDelivery(undone, D('a1', 1)))).toHaveLength(1);
  });

  it("a bowler's 3rd, 4th and 5th wickets yield threeWkts, fourWkts, fiveWkts", () => {
    const outs = ['a1', 'a3', 'a4', 'a5', 'a6'];
    const expected = [[], [], ['threeWkts'], ['fourWkts'], ['fiveWkts']];
    outs.forEach((_, i) => {
      const s = play(outs.slice(0, i + 1).map(wicketBall));
      expect(lastBallMilestones(s).map(m => m.kind)).toEqual(expected[i]);
    });
    const s = play(outs.slice(0, 3).map(wicketBall));
    expect(lastBallMilestones(s)).toEqual([{ kind: 'threeWkts', playerId: 'b1', inningsIndex: 0 }]);
  });

  it('a run-out does not count toward the bowler', () => {
    const runout = (id: string) => D(id, 0, { wicket: { type: 'runout', outPlayerId: id } });
    const s = play([wicketBall('a1'), wicketBall('a3'), runout('a4')]);
    expect(lastBallMilestones(s)).toEqual([]);
  });
});
