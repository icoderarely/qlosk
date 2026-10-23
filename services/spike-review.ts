// Review of unusual traffic (spec section 7). Scans held as spike_review stay
// out of every counted number and out of the monthly report until an admin
// chooses Count them (they become normal scans) or Mark as bots (they stay
// flagged, with a reason that says an admin decided). Nothing is deleted. The
// days those scans fell on are rebuilt at once so the reports show the new
// numbers. No Next.js imports.
import { rebuildDays, type RollupStore } from "./daily-stats.ts";

export type SpikeDecision = "count" | "mark_bots";

export type ReviewStore = {
  /** Resolves every held scan of the shop and writes a change_log row, in one
   * transaction. Returns null when the shop does not exist. */
  resolve(args: {
    shopId: string;
    decision: SpikeDecision;
    what: (shopName: string, scans: number) => string;
    userEmail: string;
  }): Promise<{ shopName: string; scans: number; days: string[] } | null>;
};

export type ReviewResult = { ok: true; message: string } | { ok: false; error: string };

export function isSpikeDecision(value: unknown): value is SpikeDecision {
  return value === "count" || value === "mark_bots";
}

export async function reviewSpike(
  store: ReviewStore,
  rollup: RollupStore,
  shopId: string,
  decision: unknown,
  userEmail: string,
): Promise<ReviewResult> {
  if (!isSpikeDecision(decision)) return { ok: false, error: "Choose Count them or Mark as bots." };
  const done = await store.resolve({
    shopId,
    decision,
    userEmail,
    what: (name, scans) =>
      decision === "count"
        ? `Unusual traffic reviewed: ${scans} held scans counted for ${name}`
        : `Unusual traffic reviewed: ${scans} held scans marked as bots for ${name}`,
  });
  if (!done) return { ok: false, error: "This shop no longer exists." };
  if (done.scans === 0) return { ok: false, error: `${done.shopName} has no scans held for review.` };
  try {
    await rebuildDays(rollup, done.days);
  } catch (error) {
    console.error("rollup after spike review failed", error);
    return {
      ok: false,
      error: "Your decision was saved, but the reports could not be refreshed. Run the daily stats job again.",
    };
  }
  return {
    ok: true,
    message:
      decision === "count"
        ? `Counted ${done.scans} scans for ${done.shopName}. They are in the reports now.`
        : `Marked ${done.scans} scans for ${done.shopName} as bots. They stay out of the numbers.`,
  };
}
