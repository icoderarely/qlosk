// Kept apart from the chart component so node --test can load it.
/** Smallest "round" top (4 steps of 1, 2, 5 or 10 times a power of ten) that holds `max`. */
export function niceMax(max: number): number {
  const raw = Math.max(1, max / 4);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return step * 4;
}
