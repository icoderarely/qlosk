// Nightly rollup (spec section 7): rebuilds daily_stats from the raw events for
// the last two days, so a late-arriving flag (a held spike, say) fixes the
// numbers. Counted numbers leave out flagged events; flagged ones are kept in
// the bot columns. Days are India days, the same as the visitor-hash salt.
// Rebuilding a day replaces it, so running the job twice changes nothing.
// No Next.js imports.
import { dayKey } from "./tracking.ts";

export type DayRow = {
  shopId: string;
  scans: number;
  taps: number;
  botScans: number;
  botTaps: number;
  /** Part of botScans: scans held for review (spike_review). */
  heldScans: number;
  /** Counted taps per link id. */
  tapsByLink: Record<string, number>;
  /** Flagged scans and taps by bot_reason. */
  flagReasons: Record<string, number>;
};

export type RollupStore = {
  /** Per-shop numbers for events with `from <= at < to`. Only shops with events appear. */
  aggregate(from: Date, to: Date): Promise<DayRow[]>;
  /** Replaces every row of `day` (YYYY-MM-DD) with `rows`, in one transaction. */
  replaceDay(day: string, rows: DayRow[]): Promise<void>;
};

const DAY_MS = 24 * 3600_000;

/** [start, end) of an India day. */
export function dayRange(day: string): { from: Date; to: Date } {
  const from = new Date(`${day}T00:00:00+05:30`);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}

/** The last `count` India days ending today, oldest first. */
export function lastDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => dayKey(new Date(now.getTime() - (count - 1 - i) * DAY_MS)));
}

export async function rebuildDailyStats(
  store: RollupStore,
  now: Date = new Date(),
  days = 2,
): Promise<{ days: string[]; shops: number }> {
  const list = lastDays(now, days);
  let shops = 0;
  for (const day of list) {
    const { from, to } = dayRange(day);
    const rows = await store.aggregate(from, to);
    await store.replaceDay(day, rows);
    shops += rows.length;
  }
  return { days: list, shops };
}

/** Rebuilds exactly these India days (YYYY-MM-DD), for when an admin's decision changes old events. */
export async function rebuildDays(store: RollupStore, days: string[]): Promise<void> {
  for (const day of [...new Set(days)]) {
    const { from, to } = dayRange(day);
    await store.replaceDay(day, await store.aggregate(from, to));
  }
}
