const add = (a: number, b: number): number => a + b;

describe('smoke', () => {
  it('does arithmetic', () => {
    expect(1 + 1).toBe(2);
  });
  it('runs an inline pure helper', () => {
    expect(add(2, 3)).toBe(5);
  });
});
