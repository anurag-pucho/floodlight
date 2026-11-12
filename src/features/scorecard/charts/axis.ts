/** Round-number tick values from 0 up to and including a "nice" ceiling of `max`. */
export function niceTicks(max: number, target = 4): number[] {
  const safe = Math.max(1, max);
  const rough = safe / target;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10) * pow;
  const ticks: number[] = [];
  for (let v = 0; v < safe + step; v += step) {
    ticks.push(v);
    if (v >= safe) break;
  }
  return ticks;
}
