import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RollupStore } from "./daily-stats.ts";
import { reviewSpike, type ReviewStore, type SpikeDecision } from "./spike-review.ts";

function setup(held: string[] | null, failRollup = false) {
  const calls: { decision?: SpikeDecision; rebuilt: string[]; logged: string[] } = { rebuilt: [], logged: [] };
  const store: ReviewStore = {
    async resolve({ decision, what }) {
      if (held === null) return null;
      calls.decision = decision;
      const message = what("Iron House", 3);
      calls.logged.push(message);
      return { shopName: "Iron House", scans: held.length === 0 ? 0 : 3, days: held };
    },
  };
  const rollup: RollupStore = {
    async aggregate() {
      return [];
    },
    async replaceDay(day) {
      if (failRollup) throw new Error("db down");
      calls.rebuilt.push(day);
    },
  };
  return { calls, store, rollup };
}

describe("reviewSpike", () => {
  it("counts the held scans and rebuilds the days they fell on", async () => {
    const { calls, store, rollup } = setup(["2026-10-21", "2026-10-22"]);
    const result = await reviewSpike(store, rollup, "s1", "count", "me@example.com");
    assert.deepEqual(result, { ok: true, message: "Counted 3 scans for Iron House. They are in the reports now." });
    assert.equal(calls.decision, "count");
    assert.deepEqual(calls.rebuilt, ["2026-10-21", "2026-10-22"]);
    assert.match(calls.logged[0], /counted/);
  });

  it("keeps marked scans out of the numbers and still rebuilds", async () => {
    const { calls, store, rollup } = setup(["2026-10-21"]);
    const result = await reviewSpike(store, rollup, "s1", "mark_bots", "me@example.com");
    assert.equal(result.ok, true);
    assert.equal(calls.decision, "mark_bots");
    assert.deepEqual(calls.rebuilt, ["2026-10-21"]);
    assert.match(calls.logged[0], /marked as bots/);
  });

  it("refuses an unknown decision before touching anything", async () => {
    const { calls, store, rollup } = setup(["2026-10-21"]);
    const result = await reviewSpike(store, rollup, "s1", "delete", "me@example.com");
    assert.equal(result.ok, false);
    assert.equal(calls.decision, undefined);
    assert.deepEqual(calls.rebuilt, []);
  });

  it("says so when nothing is held", async () => {
    const { calls, store, rollup } = setup([]);
    const result = await reviewSpike(store, rollup, "s1", "count", "me@example.com");
    assert.deepEqual(result, { ok: false, error: "Iron House has no scans held for review." });
    assert.deepEqual(calls.rebuilt, []);
  });

  it("says so when the shop is gone", async () => {
    const { store, rollup } = setup(null);
    const result = await reviewSpike(store, rollup, "s1", "count", "me@example.com");
    assert.deepEqual(result, { ok: false, error: "This shop no longer exists." });
  });

  it("reports a failed refresh instead of pretending it worked", async () => {
    const { store, rollup } = setup(["2026-10-21"], true);
    const result = await reviewSpike(store, rollup, "s1", "count", "me@example.com");
    assert.equal(result.ok, false);
  });
});
