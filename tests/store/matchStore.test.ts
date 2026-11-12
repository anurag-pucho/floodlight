import { createMatchStore } from '../../src/store/matchStore';
import type { StoreRepo } from '../../src/store/types';
import { createMatch, teamTotal } from '../../src/engine';
import type { DeliveryInput, MatchConfig, MatchState } from '../../src/engine';

const ids = ['a1', 'a2', 'b1', 'b2'];
const config: MatchConfig = {
  id: 'm1',
  teamA: { id: 'A', name: 'Alpha', color: '#f00', players: [{ playerId: 'a1', isShared: false }, { playerId: 'a2', isShared: false }] },
  teamB: { id: 'B', name: 'Bravo', color: '#00f', players: [{ playerId: 'b1', isShared: false }, { playerId: 'b2', isShared: false }] },
  players: Object.fromEntries(ids.map((id) => [id, { id, name: id }])),
  rules: { oversPerInnings: 1, wideRuns: 1, noBallRuns: 1, freeHitOnNoBall: true, lastManStands: false, byesEnabled: true },
  battingFirst: 'A',
};
const inn0: DeliveryInput = { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runsBat: 0 };
const inn1: DeliveryInput = { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a1', runsBat: 4 };

function fakeRepo(resumable: MatchState | null = null) {
  const repo = {
    saveMatch: jest.fn().mockResolvedValue(undefined),
    loadMatch: jest.fn().mockResolvedValue(resumable),
    getResumable: jest.fn().mockResolvedValue(resumable),
  };
  return repo satisfies StoreRepo;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function make(repo: StoreRepo = fakeRepo()) {
  return { repo, store: createMatchStore({ getRepo: () => repo, debounceMs: 400 }) };
}

test('newMatch sets engine state and saves in_progress', () => {
  const { repo, store } = make();
  store.getState().newMatch(config);
  expect(store.getState().state).toEqual(createMatch(config));
  expect(repo.saveMatch).toHaveBeenCalledWith(createMatch(config), 'in_progress');
});

test('delivery applies via engine and saves once after debounce', () => {
  const { repo, store } = make();
  store.getState().newMatch(config);
  (repo.saveMatch as jest.Mock).mockClear();
  store.getState().delivery({ ...inn0, runsBat: 4 });
  store.getState().delivery({ ...inn0, runsBat: 2 });
  expect(teamTotal(store.getState().state!, 0)).toBe(6);
  expect(repo.saveMatch).not.toHaveBeenCalled();
  jest.advanceTimersByTime(400);
  expect(repo.saveMatch).toHaveBeenCalledTimes(1);
  const [saved, status] = (repo.saveMatch as jest.Mock).mock.calls[0];
  expect(saved).toBe(store.getState().state);
  expect(status).toBe('in_progress');
});

test('retire applies via engine and autosaves', () => {
  const { repo, store } = make();
  store.getState().newMatch(config);
  store.getState().delivery({ ...inn0, runsBat: 1 });
  jest.advanceTimersByTime(400);
  (repo.saveMatch as jest.Mock).mockClear();
  store.getState().retire({ playerId: 'a1', out: true });
  expect(store.getState().state!.retires).toHaveLength(1);
  expect(repo.saveMatch).not.toHaveBeenCalled();
  jest.advanceTimersByTime(400);
  expect(repo.saveMatch).toHaveBeenCalledTimes(1);
  const [saved, status] = (repo.saveMatch as jest.Mock).mock.calls[0];
  expect(saved).toBe(store.getState().state);
  expect(saved.retires).toHaveLength(1);
  expect(status).toBe('in_progress');
});

test('undo and redo revert and restore the last ball', () => {
  const { store } = make();
  store.getState().newMatch(config);
  store.getState().delivery({ ...inn0, runsBat: 4 });
  store.getState().undo();
  expect(teamTotal(store.getState().state!, 0)).toBe(0);
  store.getState().redo();
  expect(teamTotal(store.getState().state!, 0)).toBe(4);
});

test('editBall changes a recorded ball', () => {
  const { store } = make();
  store.getState().newMatch(config);
  store.getState().delivery({ ...inn0, runsBat: 1 });
  const id = store.getState().state!.events[0].id;
  store.getState().editBall(id, { ...inn0, runsBat: 6 });
  expect(teamTotal(store.getState().state!, 0)).toBe(6);
});

test('actions are no-ops without a match', () => {
  const { repo, store } = make();
  store.getState().delivery(inn0);
  store.getState().undo();
  jest.advanceTimersByTime(1000);
  expect(store.getState().state).toBeNull();
  expect(repo.saveMatch).not.toHaveBeenCalled();
});

test('resume loads from getResumable and reports found / not found', async () => {
  const saved = createMatch(config);
  const { store } = make(fakeRepo(saved));
  await expect(store.getState().resume()).resolves.toBe(true);
  expect(store.getState().state).toBe(saved);
  const empty = make(fakeRepo(null));
  await expect(empty.store.getState().resume()).resolves.toBe(false);
  expect(empty.store.getState().state).toBeNull();
});

test('loadById loads via loadMatch', async () => {
  const saved = createMatch(config);
  const { repo, store } = make(fakeRepo(saved));
  await store.getState().loadById('m1');
  expect(repo.loadMatch).toHaveBeenCalledWith('m1');
  expect(store.getState().state).toBe(saved);
});

test('finishMatch saves complete only when the match is decided', () => {
  const { repo, store } = make();
  store.getState().newMatch(config);
  (repo.saveMatch as jest.Mock).mockClear();
  store.getState().finishMatch();
  expect(repo.saveMatch).not.toHaveBeenCalled();

  for (let i = 0; i < 6; i++) store.getState().delivery(inn0);
  store.getState().startNextInnings();
  store.getState().delivery(inn1);
  (repo.saveMatch as jest.Mock).mockClear();
  store.getState().finishMatch();
  expect(repo.saveMatch).toHaveBeenCalledTimes(1);
  expect((repo.saveMatch as jest.Mock).mock.calls[0][1]).toBe('complete');
  jest.advanceTimersByTime(1000);
  expect(repo.saveMatch).toHaveBeenCalledTimes(1);
});
