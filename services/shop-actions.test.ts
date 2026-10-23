import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Decision, QrRecord, QrStore } from "./qr.ts";
import { changeShopStatus, nextStatus, undoChange, type ShopActionsStore } from "./shop-actions.ts";
import type { ChangeEntry, UndoPayload } from "./undo.ts";
import { undoableIds } from "./undo.ts";
import type { DbShopStatus } from "./shops.ts";

const S1 = "00000000-0000-4000-8000-000000000001";
const S2 = "00000000-0000-4000-8000-000000000002";

describe("nextStatus", () => {
  it("pauses and archives any shop that is not already so", () => {
    assert.deepEqual(nextStatus("live", "pause", true), { ok: true, status: "paused" });
    assert.deepEqual(nextStatus("building", "archive", false), { ok: true, status: "archived" });
    assert.equal(nextStatus("paused", "pause", true).ok, false);
    assert.equal(nextStatus("archived", "pause", true).ok, false);
    assert.equal(nextStatus("archived", "archive", true).ok, false);
  });

  it("brings a paused or archived shop back to live if it has a published page, else building", () => {
    assert.deepEqual(nextStatus("paused", "resume", true), { ok: true, status: "live" });
    assert.deepEqual(nextStatus("paused", "resume", false), { ok: true, status: "building" });
    assert.deepEqual(nextStatus("archived", "restore", true), { ok: true, status: "live" });
    assert.equal(nextStatus("live", "resume", true).ok, false);
    assert.equal(nextStatus("live", "restore", true).ok, false);
  });
});

function fakeActions(initial: { status: DbShopStatus; hasPublished?: boolean }) {
  const state = { status: initial.status, look: null as unknown, draft: null as unknown };
  const log: ChangeEntry[] = [];
  let n = 0;
  const add = (what: string, undo: unknown = null) => {
    const id = `00000000-0000-4000-8000-${String(100 + ++n).padStart(12, "0")}`;
    log.unshift({ id, what, userEmail: "a@b.c", at: new Date(), undoPayload: undo });
    return id;
  };
  const store: ShopActionsStore = {
    async status() { return { status: state.status, hasPublished: initial.hasPublished ?? true }; },
    async setStatus({ status, what, undo }) { state.status = status; add(what, undo); },
    async changes() { return log; },
    async change(_s, id) { return log.find((e) => e.id === id) ?? null; },
    async applyUndo({ changeId, action, what }) {
      if (action.type === "status") state.status = action.status;
      if (action.type === "look") state.look = action.look;
      if (action.type === "draft") state.draft = action.config;
      log.find((e) => e.id === changeId)!.undoPayload = null;
      add(what);
    },
    async finishUndo({ changeId, what }) {
      log.find((e) => e.id === changeId)!.undoPayload = null;
      add(what);
    },
  };
  return { store, state, log, add };
}

function fakeQr(records: Record<string, QrRecord>) {
  const calls: string[] = [];
  const qr = {
    async find(code: string) { return records[code] ?? null; },
    async release({ code }: { code: string }): Promise<Decision> {
      calls.push(`release ${code}`);
      records[code] = { ...records[code], status: "unassigned", shopId: null };
      return { ok: true };
    },
    async reassign({ code, toShopId, undoable }: { code: string; toShopId: string; undoable?: boolean }): Promise<Decision> {
      calls.push(`reassign ${code} -> ${toShopId} undoable=${undoable}`);
      records[code] = { ...records[code], shopId: toShopId };
      return { ok: true };
    },
  } as unknown as QrStore;
  return { qr, calls };
}

describe("changeShopStatus and Undo", () => {
  it("pauses a shop, logs it with an undo, and Undo puts the old status back", async () => {
    const { store, state, log } = fakeActions({ status: "live" });
    const { qr } = fakeQr({});
    assert.deepEqual(await changeShopStatus(store, S1, "pause", "a@b.c"), { ok: true });
    assert.equal(state.status, "paused");
    assert.deepEqual(log[0].undoPayload, { kind: "status", before: "live" });

    assert.deepEqual(await undoChange({ store, qr }, S1, log[0].id, "a@b.c"), { ok: true });
    assert.equal(state.status, "live");
    assert.match(log[0].what, /^Undid: Shop paused/);
  });

  it("will not undo the same change twice", async () => {
    const { store, log } = fakeActions({ status: "live" });
    const { qr } = fakeQr({});
    await changeShopStatus(store, S1, "pause", "a@b.c");
    const id = log[0].id;
    await undoChange({ store, qr }, S1, id, "a@b.c");
    assert.equal((await undoChange({ store, qr }, S1, id, "a@b.c")).ok, false);
  });

  it("only lets the newest change of a kind be undone", async () => {
    const { store, log, state } = fakeActions({ status: "live" });
    const { qr } = fakeQr({});
    await changeShopStatus(store, S1, "pause", "a@b.c");
    const first = log[0].id;
    await changeShopStatus(store, S1, "archive", "a@b.c");
    const r = await undoChange({ store, qr }, S1, first, "a@b.c");
    assert.equal(r.ok, false);
    assert.equal(state.status, "archived");
    assert.equal((await undoChange({ store, qr }, S1, log[0].id, "a@b.c")).ok, true);
    assert.equal(state.status, "paused");
  });

  it("refuses entries with no undo, unknown entries and malformed payloads", async () => {
    const { store, add } = fakeActions({ status: "live" });
    const { qr } = fakeQr({});
    const plain = add("Published page");
    const broken = add("Weird", { kind: "status", before: "not-a-status" });
    for (const id of [plain, broken, "00000000-0000-4000-8000-0000000000ff"]) {
      assert.equal((await undoChange({ store, qr }, S1, id, "a@b.c")).ok, false);
    }
  });

  it("restores the previous draft", async () => {
    const { store, state, add } = fakeActions({ status: "live" });
    const { qr } = fakeQr({});
    const id = add("Draft saved: details", { kind: "draft", config: { theme: "blush" } } satisfies UndoPayload);
    assert.equal((await undoChange({ store, qr }, S1, id, "a@b.c")).ok, true);
    assert.deepEqual(state.draft, { theme: "blush" });
  });

  it("puts the old look back (bulk change from the shops list)", async () => {
    const { store, state, add } = fakeActions({ status: "live" });
    const { qr } = fakeQr({});
    const before = { theme: "blush", layout: "list", font: "clean" } as const;
    const id = add("Look changed", { kind: "look", before });
    await undoChange({ store, qr }, S1, id, "a@b.c");
    assert.deepEqual(state.look, before);
  });
});

describe("Undo of QR code changes", () => {
  it("returns an assigned code to stock", async () => {
    const { store, add, log } = fakeActions({ status: "live" });
    const { qr, calls } = fakeQr({ "7KX2M9": { code: "7KX2M9", status: "assigned", shopId: S1 } });
    const id = add("QR code 7KX2M9 assigned", { kind: "qr", op: "assign", code: "7KX2M9", from: null });
    assert.deepEqual(await undoChange({ store, qr }, S1, id, "a@b.c"), { ok: true });
    assert.deepEqual(calls, ["release 7KX2M9"]);
    assert.match(log[0].what, /^Undid:/);
  });

  it("moves a reassigned code back, without offering another Undo", async () => {
    const { store, add } = fakeActions({ status: "live" });
    const { qr, calls } = fakeQr({ "7KX2M9": { code: "7KX2M9", status: "assigned", shopId: S1 } });
    const id = add("QR code moved here", { kind: "qr", op: "reassign", code: "7KX2M9", from: S2 });
    assert.deepEqual(await undoChange({ store, qr }, S1, id, "a@b.c"), { ok: true });
    assert.deepEqual(calls, [`reassign 7KX2M9 -> ${S2} undoable=false`]);
  });

  it("refuses when the code has moved on or been retired since", async () => {
    const { store, add } = fakeActions({ status: "live" });
    for (const record of [
      { code: "7KX2M9", status: "retired" as const, shopId: null },
      { code: "7KX2M9", status: "assigned" as const, shopId: S2 },
    ]) {
      const { qr, calls } = fakeQr({ "7KX2M9": record });
      const id = add("QR code assigned", { kind: "qr", op: "assign", code: "7KX2M9", from: null });
      const r = await undoChange({ store, qr }, S1, id, "a@b.c");
      assert.equal(r.ok, false);
      assert.deepEqual(calls, []);
    }
  });
});

describe("undoableIds", () => {
  it("marks only the newest undoable entry of each kind", () => {
    const e = (id: string, undoPayload: unknown): ChangeEntry => ({ id, what: id, userEmail: "x", at: new Date(), undoPayload });
    const ids = undoableIds([
      e("d2", { kind: "draft", config: {} }),
      e("s1", { kind: "status", before: "live" }),
      e("plain", null),
      e("d1", { kind: "draft", config: {} }),
    ]);
    assert.deepEqual([...ids].sort(), ["d2", "s1"]);
  });
});
