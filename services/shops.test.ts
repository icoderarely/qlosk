import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SHOP_PAGE_SIZE,
  bulkUpdateLook,
  describeLookChange,
  filterFromQuery,
  getNewShopEditor,
  getShopEditor,
  getShops,
  parseListQuery,
  planNote,
  type DbShopStatus,
  type Look,
  type LookChange,
  type ShopFilter,
  type ShopRecord,
  type ShopsStore,
} from "./shops.ts";

// The admin pages read through these functions, and the mock data is replaced
// by database queries in a later slice. These tests pin the shape the pages
// rely on, so that swap cannot change it silently.
describe("shops service (mock data)", () => {
  it("returns an editor for a known shop and null for an unknown id", async () => {
    const velvet = await getShopEditor("1");
    assert.equal(velvet?.details.name, "Velvet Salon & Spa");
    assert.deepEqual(velvet?.look, { theme: "blush", layout: "list", font: "editorial" });
    assert.equal(await getShopEditor("nope"), null);
  });

  it("gives each caller its own copy, so editing one cannot change the next read", async () => {
    const a = await getShopEditor("1");
    a?.links.splice(0, 1);
    const b = await getShopEditor("1");
    assert.equal(b?.links.length, 7);
  });

  it("starts a new shop empty, with no id and no code", async () => {
    const fresh = await getNewShopEditor();
    assert.equal(fresh.id, null);
    assert.equal(fresh.code, null);
    assert.equal(fresh.details.name, "");
    assert.equal(fresh.changes.length, 0);
  });
});

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function record(n: number, extra: Partial<ShopRecord> = {}): ShopRecord {
  return {
    id: UUID(n),
    name: `Shop ${n}`,
    slug: `shop-${n}`,
    shopType: "Salon",
    status: "live",
    code: null,
    planName: "Yearly",
    planMonths: 12,
    planStartedAt: null,
    planEndsAt: null,
    look: { theme: "daylight", layout: "list", font: "clean" },
    scans: null,
    ...extra,
  };
}

// Records what the service asks for. Filtering itself is the store's job (it is
// a database query), so this fake only slices and counts.
function fakeStore(all: ShopRecord[], byStatus: Partial<Record<DbShopStatus, number>> = {}) {
  const calls: { filter: ShopFilter; skip: number; take: number }[] = [];
  const applied: { ids: string[]; patch: Partial<Look>; userEmail: string; what: string[] }[] = [];
  const store: ShopsStore = {
    async list(filter, skip, take) {
      calls.push({ filter, skip, take });
      return { rows: all.slice(skip, skip + take), total: all.length };
    },
    async countByStatus() {
      return byStatus;
    },
    async shopTypes() {
      return ["Salon"];
    },
    async planNames() {
      return ["Monthly", "Yearly"];
    },
    async applyLook({ ids, patch, userEmail, describe }) {
      const changes: LookChange[] = ids.map((shopId) => ({
        shopId,
        name: shopId,
        before: { theme: "daylight", layout: "list", font: "clean" },
        after: { theme: "daylight", layout: "list", font: "clean", ...patch },
      }));
      applied.push({ ids, patch, userEmail, what: changes.map(describe) });
      return changes;
    },
  };
  return { store, calls, applied };
}

describe("parseListQuery", () => {
  it("falls back to the defaults for an empty query", () => {
    assert.deepEqual(parseListQuery({}), {
      tab: "all", q: "", type: "", theme: "", layout: "", plan: "", page: 1,
    });
  });

  it("drops values it does not know instead of failing", () => {
    const q = parseListQuery({ tab: "nope", theme: "neon", layout: "grid", page: "-3" });
    assert.equal(q.tab, "all");
    assert.equal(q.theme, "");
    assert.equal(q.layout, "");
    assert.equal(q.page, 1);
  });

  it("keeps valid values and trims the search", () => {
    const q = parseListQuery({ tab: "live", theme: "blush", layout: "cover", q: "  velvet ", page: "2" });
    assert.deepEqual(
      [q.tab, q.theme, q.layout, q.q, q.page],
      ["live", "blush", "cover", "velvet", 2],
    );
  });

  it("takes the first value when a param is repeated", () => {
    assert.equal(parseListQuery({ tab: ["preview", "live"] }).tab, "preview");
  });
});

describe("filterFromQuery", () => {
  it("makes the Live tab hold live and quiet shops, and All hold every status", () => {
    assert.deepEqual(filterFromQuery(parseListQuery({ tab: "live" })).statuses, ["live", "quiet"]);
    assert.equal(filterFromQuery(parseListQuery({})).statuses, null);
  });
});

describe("getShops", () => {
  it("asks for 8 shops per page and reports the page count", async () => {
    const all = Array.from({ length: 20 }, (_, i) => record(i + 1));
    const { store, calls } = fakeStore(all);
    const list = await getShops(store, parseListQuery({ page: "2" }));
    assert.equal(SHOP_PAGE_SIZE, 8);
    assert.deepEqual([calls[0].skip, calls[0].take], [8, 8]);
    assert.equal(list.shops.length, 8);
    assert.equal(list.shops[0].name, "Shop 9");
    assert.deepEqual([list.page, list.pageCount, list.total], [2, 3, 20]);
  });

  it("shows the last page when the requested page is past the end", async () => {
    const all = Array.from({ length: 10 }, (_, i) => record(i + 1));
    const { store } = fakeStore(all);
    const list = await getShops(store, parseListQuery({ page: "9" }));
    assert.equal(list.page, 2);
    assert.equal(list.shops.length, 2);
  });

  it("handles an empty list as one empty page", async () => {
    const { store } = fakeStore([]);
    const list = await getShops(store, parseListQuery({}));
    assert.deepEqual([list.page, list.pageCount, list.shops.length], [1, 1, 0]);
  });

  it("builds tab counts from the status counts, with Quiet inside Live", async () => {
    const { store } = fakeStore([], { live: 5, quiet: 1, preview: 2, building: 2, expired: 1, paused: 1 });
    const { tabCounts } = await getShops(store, parseListQuery({}));
    assert.deepEqual(tabCounts, { all: 12, live: 6, preview: 2, building: 2, expired: 1 });
  });

  it("passes the filters through to the store", async () => {
    const { store, calls } = fakeStore([]);
    await getShops(store, parseListQuery({ q: "mehta", type: "Clinic", theme: "blush", layout: "tiles", plan: "Monthly" }));
    assert.deepEqual(calls[0].filter, {
      statuses: null, q: "mehta", shopType: "Clinic", theme: "blush", layout: "tiles", planName: "Monthly",
    });
  });

  it("maps a record to a row, with fallbacks for a shop with no plan or type", async () => {
    const { store } = fakeStore([record(1, { planName: null, shopType: null, look: null })]);
    const { shops } = await getShops(store, parseListQuery({}));
    assert.equal(shops[0].plan, "No plan");
    assert.equal(shops[0].typeLabel, "");
    assert.equal(shops[0].look, null);
    assert.equal(shops[0].planNote, "Not started");
  });
});

describe("planNote", () => {
  const now = new Date("2026-10-23T06:00:00Z");
  const base = { status: "live" as const, planMonths: 12, planStartedAt: new Date("2026-01-01T00:00:00Z") };

  it("says Not started before a plan begins", () => {
    assert.equal(planNote({ ...base, planStartedAt: null, planEndsAt: null }, now), "Not started");
  });

  it("counts days when a renewal is within a week", () => {
    assert.equal(planNote({ ...base, planEndsAt: new Date("2026-10-28T06:00:00Z") }, now), "Renews in 5 days");
    assert.equal(planNote({ ...base, planEndsAt: new Date("2026-10-24T06:00:00Z") }, now), "Renews tomorrow");
  });

  it("shows the date for a later renewal", () => {
    assert.equal(planNote({ ...base, planEndsAt: new Date("2027-03-14T06:00:00Z") }, now), "Renews 14 Mar");
  });

  it("shows month and year for a five-year plan", () => {
    assert.equal(
      planNote({ ...base, planMonths: 60, planEndsAt: new Date("2031-08-10T06:00:00Z") }, now),
      "Ends Aug 2031",
    );
  });

  it("shows when an expired plan ended", () => {
    assert.equal(
      planNote({ ...base, status: "expired", planEndsAt: new Date("2026-10-01T06:00:00Z") }, now),
      "Ended 1 Oct",
    );
  });

  it("uses Indian time for the date", () => {
    // 20:00 UTC on 13 Mar is already 14 Mar in India.
    assert.equal(planNote({ ...base, planEndsAt: new Date("2027-03-13T20:00:00Z") }, now), "Renews 14 Mar");
  });
});

describe("bulkUpdateLook", () => {
  it("applies only the chosen fields and records who did it", async () => {
    const { store, applied } = fakeStore([]);
    const res = await bulkUpdateLook(store, { ids: [UUID(1), UUID(2)], theme: "blush", font: "rounded" }, "owner@admin.local");
    assert.deepEqual(res, { ok: true, updated: 2 });
    assert.deepEqual(applied[0].patch, { theme: "blush", font: "rounded" });
    assert.equal(applied[0].userEmail, "owner@admin.local");
  });

  it("writes a readable change_log line with the old and new look", async () => {
    const { store, applied } = fakeStore([]);
    await bulkUpdateLook(store, { ids: [UUID(1)], layout: "cover" }, "a@b.c");
    assert.equal(applied[0].what[0], "Look changed: daylight · list · clean → daylight · cover · clean");
    assert.match(
      describeLookChange({ shopId: "x", name: "x", before: null, after: { theme: "blush", layout: "list", font: "clean" } }),
      /no look set → blush/,
    );
  });

  it("rejects a change with nothing to apply", async () => {
    const { store, applied } = fakeStore([]);
    const res = await bulkUpdateLook(store, { ids: [UUID(1)] }, "a@b.c");
    assert.equal(res.ok, false);
    assert.equal(applied.length, 0);
  });

  it("rejects an empty selection, too many shops, bad ids and unknown looks", async () => {
    const { store, applied } = fakeStore([]);
    const tooMany = Array.from({ length: 101 }, (_, i) => UUID(i + 1));
    for (const input of [
      { ids: [], theme: "blush" },
      { ids: tooMany, theme: "blush" },
      { ids: ["not-a-uuid"], theme: "blush" },
      { ids: [UUID(1)], theme: "neon" },
      { ids: [UUID(1)], layout: "grid" },
      { ids: [UUID(1)], font: "comic" },
      null,
      "theme=blush",
    ]) {
      assert.equal((await bulkUpdateLook(store, input, "a@b.c")).ok, false, JSON.stringify(input));
    }
    assert.equal(applied.length, 0);
  });

  it("ignores duplicate ids", async () => {
    const { store, applied } = fakeStore([]);
    await bulkUpdateLook(store, { ids: [UUID(1), UUID(1)], theme: "graphite" }, "a@b.c");
    assert.deepEqual(applied[0].ids, [UUID(1)]);
  });
});
