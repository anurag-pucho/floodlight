import { DEFAULT_PREFS, createPrefsStore, type KeyValueStorage } from '../../src/prefs/prefs';

function fakeStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => Promise.resolve(data[k] ?? null),
    setItem: (k, v) => {
      data[k] = v;
      return Promise.resolve();
    },
  };
}

const failing: KeyValueStorage = {
  getItem: () => Promise.reject(new Error('read boom')),
  setItem: () => Promise.reject(new Error('write boom')),
};

describe('prefs store', () => {
  it('defaults to dark / en / haptics on when storage is empty', async () => {
    const store = createPrefsStore(fakeStorage());
    expect(store.get()).toEqual({ scheme: 'dark', lang: 'en', haptics: true });
    await expect(store.hydrate()).resolves.toEqual(DEFAULT_PREFS);
  });

  it('round-trips set values through storage', async () => {
    const storage = fakeStorage();
    const a = createPrefsStore(storage);
    await a.set({ scheme: 'light' });
    await a.set({ lang: 'hi' });
    await a.set({ haptics: false });
    const b = createPrefsStore(storage);
    await expect(b.hydrate()).resolves.toEqual({ scheme: 'light', lang: 'hi', haptics: false });
    expect(b.get().scheme).toBe('light');
  });

  it('falls back to defaults on read errors without throwing', async () => {
    const store = createPrefsStore(failing);
    await expect(store.hydrate()).resolves.toEqual(DEFAULT_PREFS);
  });

  it('ignores corrupt or invalid stored values', async () => {
    const bad = createPrefsStore(fakeStorage({ 'floodlight.prefs.v1': '{nope' }));
    await expect(bad.hydrate()).resolves.toEqual(DEFAULT_PREFS);
    const wrong = createPrefsStore(
      fakeStorage({ 'floodlight.prefs.v1': JSON.stringify({ scheme: 'blue', lang: 'fr', haptics: 'yes' }) }),
    );
    await expect(wrong.hydrate()).resolves.toEqual(DEFAULT_PREFS);
  });

  it('write errors do not throw and the in-memory value still updates', async () => {
    const store = createPrefsStore(failing);
    await expect(store.set({ scheme: 'light' })).resolves.toBeUndefined();
    expect(store.get().scheme).toBe('light');
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const store = createPrefsStore(fakeStorage());
    const cb = jest.fn();
    const off = store.subscribe(cb);
    await store.set({ haptics: false });
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    await store.set({ haptics: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
