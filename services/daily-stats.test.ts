import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dayRange, lastDays, rebuildDailyStats, rebuildDays, type DayRow, type RollupStore } from "./daily-stats.ts";

describe("lastDays", () => {
  it("lists the last two India days, oldest first", () => {
    assert.deepEqual(lastDays(new Date("2026-10-24T12:00:00Z"), 2), ["2026-10-23", "2026-10-24"]);
  });
  it("moves to the next India day after 18:30 UTC", () => {
    assert.deepEqual(lastDays(new Date("2026-10-24T19:00:00Z"), 2), ["2026-10-24", "2026-10-25"]);
  });
});

describe("dayRange", () => {
  it("runs midnight to midnight India time", () => {
    const { from, to } = dayRange("2026-10-24");
    assert.equal(from.toISOString(), "2026-10-23T18:30:00.000Z");
    assert.equal(to.toISOString(), "2026-10-24T18:30:00.000Z");
  });
});

describe("rebuildDailyStats", () => {
  const row: DayRow = { shopId: "s1", scans: 3, taps: 1, botScans: 2, botTaps: 0, heldScans: 0, tapsByLink: { l1: 1 }, flagReasons: { crawler: 2 } };
  function fake() {
    const asked: string[] = [];
    const written = new Map<string, DayRow[]>();
    const store: RollupStore = {
      async aggregate(from) { asked.push(from.toISOString()); return [row]; },
      async replaceDay(day, rows) { written.set(day, rows); },
    };
    return { store, asked, written };
  }

  it("rebuilds yesterday and today from the raw events", async () => {
    const { store, asked, written } = fake();
    const out = await rebuildDailyStats(store, new Date("2026-10-24T20:30:00Z"));
    assert.deepEqual(out, { days: ["2026-10-24", "2026-10-25"], shops: 2 });
    assert.deepEqual([...written.keys()], ["2026-10-24", "2026-10-25"]);
    assert.equal(asked.length, 2);
    assert.deepEqual(written.get("2026-10-25"), [row]);
  });

  it("replaces a day instead of adding to it, so a second run changes nothing", async () => {
    const { store, written } = fake();
    await rebuildDailyStats(store, new Date("2026-10-24T20:30:00Z"));
    const first = JSON.stringify([...written]);
    await rebuildDailyStats(store, new Date("2026-10-24T20:30:00Z"));
    assert.equal(JSON.stringify([...written]), first);
  });
});

describe("rebuildDays", () => {
  it("rebuilds exactly the days asked for, each once", async () => {
    const written: string[] = [];
    const store: RollupStore = {
      async aggregate() { return []; },
      async replaceDay(day) { written.push(day); },
    };
    await rebuildDays(store, ["2026-10-01", "2026-10-02", "2026-10-01"]);
    assert.deepEqual(written, ["2026-10-01", "2026-10-02"]);
  });
});
