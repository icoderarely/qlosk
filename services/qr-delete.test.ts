import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteCodes, type QrStore } from "./qr.ts";

function store(removed: number) {
  const calls: string[][] = [];
  const s = {
    async deleteUnassigned(codes: string[]) {
      calls.push(codes);
      return removed;
    },
  } as unknown as QrStore;
  return { s, calls };
}

describe("deleteCodes", () => {
  it("normalizes, de-duplicates and reports how many were removed", async () => {
    const { s, calls } = store(2);
    const r = await deleteCodes(s, ["abc234", "ABC234", " xyz 789 "]);
    assert.deepEqual(r, { ok: true, count: 2 });
    assert.deepEqual(calls, [["ABC234", "XYZ789"]]);
  });

  it("rejects an empty or malformed list without touching the store", async () => {
    const { s, calls } = store(1);
    for (const bad of [[], "ABC234", [1], ["ABC10O"], ["SHORT"]]) {
      const r = await deleteCodes(s, bad);
      assert.equal(r.ok, false);
    }
    assert.equal(calls.length, 0);
  });

  it("fails when nothing was unassigned, so assigned or retired codes stay", async () => {
    const { s } = store(0);
    const r = await deleteCodes(s, ["ABC234"]);
    assert.equal(r.ok, false);
  });
});
