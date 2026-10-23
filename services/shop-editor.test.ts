import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  getShopEditor,
  hasUnpublishedChanges,
  newShopData,
  newShopValues,
  publishShop,
  saveDraft,
  stable,
  type EditorStore,
  type EditorValues,
  type ShopColumns,
  type StoredShop,
} from "./shop-editor.ts";

// In-memory stand-in for the Prisma store. It follows the same rules the real
// one does: slugs are unique across shops and slug_history, a slug change adds
// the old slug to the history, publish copies the draft config.
function fakeStore() {
  const shops = new Map<string, StoredShop>();
  const history: { shopId: string; oldSlug: string }[] = [];
  const log: string[] = [];
  const undo: unknown[] = [];
  let next = 0;
  const blank = (id: string, slug: string, c: ShopColumns): StoredShop => ({
    id, slug, name: c.name, tagline: c.tagline, shopType: c.shopType, area: null, city: null,
    address: null, phone: null, whatsapp: null, waMessage: null, logoUrl: null, coverUrl: null,
    status: "building", ownerName: null, ownerWhatsapp: null, notes: null, code: null,
    planName: null, planMonths: null, planStartedAt: null, planEndsAt: null,
    draft: null, published: null, publishedAt: null,
  });
  const store: EditorStore & { links: Map<string, unknown[]> } = {
    links: new Map(),
    async find(id) {
      return shops.get(id) ?? null;
    },
    async slugAvailable(slug, except) {
      for (const s of shops.values()) if (s.slug === slug && s.id !== except) return false;
      return !history.some((h) => h.oldSlug === slug && h.shopId !== except);
    },
    async changes() {
      return [];
    },
    async traffic() {
      return { scans: null, taps: null, bots: null, lastScan: null };
    },
    async create({ slug, columns, internal, config }) {
      const id = `00000000-0000-4000-8000-${String(++next).padStart(12, "0")}`;
      shops.set(id, { ...blank(id, slug, columns), ...internal, draft: config });
      log.push("Shop created");
      return id;
    },
    async saveDraft({ id, slugChange, internal, config, logs }) {
      const s = shops.get(id)!;
      shops.set(id, { ...s, ...internal, draft: config, slug: slugChange?.to ?? s.slug });
      if (slugChange) {
        const i = history.findIndex((h) => h.oldSlug === slugChange.to);
        if (i >= 0) history.splice(i, 1);
        history.push({ shopId: id, oldSlug: slugChange.from });
      }
      log.push(...logs.map((l) => l.what));
      undo.push(...logs.map((l) => l.undo ?? null));
    },
    async publish({ id, config, columns, links }) {
      const s = shops.get(id)!;
      shops.set(id, { ...s, ...columns, area: columns.area, published: config, publishedAt: new Date() });
      store.links.set(id, links);
      log.push("Published page");
    },
  };
  return { store, shops, history, log, undo };
}

// Fixed button ids, so two calls to values() describe the same buttons.
const STARTER_LINKS = newShopValues().links.filter((l) => l.type === "call" || l.type === "whatsapp");

function values(extra: Partial<EditorValues> = {}, details: Partial<EditorValues["details"]> = {}): EditorValues {
  const base = newShopValues();
  return {
    ...base,
    ...extra,
    details: { ...base.details, name: "Velvet Salon", phone: "98200 12345", whatsapp: "98200 12345", ...details },
    // Only the buttons that need no link, so publishing is possible.
    links: STARTER_LINKS.map((l) => ({ ...l })),
  };
}

let f: ReturnType<typeof fakeStore>;
beforeEach(() => {
  f = fakeStore();
});

describe("creating a shop", () => {
  it("needs a name", async () => {
    const r = await saveDraft(f.store, null, values({}, { name: "  " }), "a@b.c");
    assert.deepEqual(r, { ok: false, error: "Enter the shop name." });
  });

  it("makes the slug from the name and logs the creation", async () => {
    const r = await saveDraft(f.store, null, values(), "a@b.c");
    assert.ok(r.ok);
    assert.equal(r.slug, "velvet-salon");
    assert.deepEqual(f.log, ["Shop created"]);
  });

  it("adds a number when the generated slug is taken, by a shop or by an old address", async () => {
    await saveDraft(f.store, null, values(), "a@b.c");
    const second = await saveDraft(f.store, null, values(), "a@b.c");
    assert.ok(second.ok && second.slug === "velvet-salon-2");
    f.history.push({ shopId: "someone-else", oldSlug: "velvet-salon-3" });
    const third = await saveDraft(f.store, null, values(), "a@b.c");
    assert.ok(third.ok && third.slug === "velvet-salon-4");
  });

  it("rejects a slug another shop uses, with a clear message", async () => {
    await saveDraft(f.store, null, values({ slug: "velvet" }), "a@b.c");
    const r = await saveDraft(f.store, null, values({ slug: "velvet" }), "a@b.c");
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /already used/);
  });

  it("rejects a malformed or reserved slug", async () => {
    for (const slug of ["Velvet Salon", "ab", "admin"]) {
      assert.equal((await saveDraft(f.store, null, values({ slug }), "a@b.c")).ok, false, slug);
    }
  });
});

describe("slug history", () => {
  async function created() {
    const r = await saveDraft(f.store, null, values({ slug: "velvet" }), "a@b.c");
    assert.ok(r.ok);
    return r.id;
  }

  it("keeps the old address in slug_history when the slug changes", async () => {
    const id = await created();
    const r = await saveDraft(f.store, id, values({ slug: "velvet-bandra" }), "a@b.c");
    assert.ok(r.ok && r.slug === "velvet-bandra");
    assert.deepEqual(f.history, [{ shopId: id, oldSlug: "velvet" }]);
    assert.ok(f.log.includes("Page address changed from velvet to velvet-bandra"));
  });

  it("writes no history when the slug stays the same", async () => {
    const id = await created();
    await saveDraft(f.store, id, values({ slug: "velvet", buttonColor: "#9F1D45" }), "a@b.c");
    assert.deepEqual(f.history, []);
  });

  it("keeps an old address reserved so another shop cannot take it", async () => {
    const id = await created();
    await saveDraft(f.store, id, values({ slug: "velvet-bandra" }), "a@b.c");
    const other = await saveDraft(f.store, null, values({ slug: "velvet" }), "a@b.c");
    assert.equal(other.ok, false);
  });

  it("lets the same shop go back to its own old address", async () => {
    const id = await created();
    await saveDraft(f.store, id, values({ slug: "velvet-bandra" }), "a@b.c");
    const back = await saveDraft(f.store, id, values({ slug: "velvet" }), "a@b.c");
    assert.ok(back.ok && back.slug === "velvet");
    assert.deepEqual(f.history, [{ shopId: id, oldSlug: "velvet-bandra" }]);
  });

  it("keeps the current slug when the field is left empty", async () => {
    const id = await created();
    const r = await saveDraft(f.store, id, values({ slug: "" }), "a@b.c");
    assert.ok(r.ok && r.slug === "velvet");
  });
});

describe("draft and publish", () => {
  it("saves to the draft and leaves the published page alone", async () => {
    const r = await saveDraft(f.store, null, values(), "a@b.c");
    assert.ok(r.ok);
    const shop = f.shops.get(r.id)!;
    assert.equal(shop.published, null);
    assert.equal(r.hasUnpublished, true);
    assert.equal(r.published, false);
    // The public columns wait for Publish; only the name is on the row.
    assert.equal(shop.phone, null);
  });

  it("copies the draft to the published page and the shop columns on publish", async () => {
    const r = await publishShop(f.store, null, values({}, { tagline: "Hair and skin", areaCity: "Bandra West, Mumbai" }), "a@b.c");
    assert.ok(r.ok && !r.hasUnpublished && r.published);
    const shop = f.shops.get(r.id)!;
    assert.equal(stable(shop.draft), stable(shop.published));
    assert.equal(shop.tagline, "Hair and skin");
    assert.equal(shop.area, "Bandra West");
    assert.equal(shop.city, "Mumbai");
    assert.equal(shop.phone, "98200 12345");
    assert.equal(hasUnpublishedChanges(shop.draft, shop.published), false);
  });

  it("shows unpublished changes again after a later edit", async () => {
    const pub = await publishShop(f.store, null, values(), "a@b.c");
    assert.ok(pub.ok);
    const edit = await saveDraft(f.store, pub.id, values({ look: { theme: "blush", layout: "list", font: "clean" } }), "a@b.c");
    assert.ok(edit.ok && edit.hasUnpublished && edit.published);
    const shop = f.shops.get(pub.id)!;
    assert.notEqual(stable(shop.draft), stable(shop.published));
  });

  it("does not log or rewrite when nothing changed", async () => {
    const r = await saveDraft(f.store, null, values(), "a@b.c");
    assert.ok(r.ok);
    const before = f.log.length;
    const again = await saveDraft(f.store, r.id, values(), "a@b.c");
    assert.ok(again.ok && again.message === "No changes to save.");
    assert.equal(f.log.length, before);
  });

  it("names what changed in the change log", async () => {
    const r = await saveDraft(f.store, null, values(), "a@b.c");
    assert.ok(r.ok);
    await saveDraft(f.store, r.id, values({}, { tagline: "New", ownerName: "Asha" }), "a@b.c");
    assert.equal(f.log.at(-1), "Draft saved: details, owner and notes");
  });

  it("saves owner fields to the shop row at once (internal, never published)", async () => {
    const r = await saveDraft(f.store, null, values({}, { ownerName: "Asha", notes: "wants blush" }), "a@b.c");
    assert.ok(r.ok);
    const shop = f.shops.get(r.id)!;
    assert.equal(shop.ownerName, "Asha");
    assert.equal(JSON.stringify(shop.draft).includes("Asha"), false);
  });

  it("reads back a field cleared in the draft as cleared", async () => {
    const r = await saveDraft(f.store, null, values({}, { tagline: "Hair" }), "a@b.c");
    assert.ok(r.ok);
    await publishShop(f.store, r.id, values({}, { tagline: "Hair" }), "a@b.c");
    await saveDraft(f.store, r.id, values({}, { tagline: "" }), "a@b.c");
    const data = await getShopEditor(f.store, r.id);
    assert.equal(data?.values.details.tagline, "");
    assert.equal(data?.published, true);
    assert.equal(data?.hasUnpublished, true);
  });

  it("returns null for an unknown shop and an error when saving one", async () => {
    assert.equal(await getShopEditor(f.store, "00000000-0000-4000-8000-0000000000ff"), null);
    const r = await saveDraft(f.store, "00000000-0000-4000-8000-0000000000ff", values(), "a@b.c");
    assert.equal(r.ok, false);
  });
});

describe("link rules on save and publish", () => {
  const withWebsite = (target: string, enabled = true) => {
    const v = values();
    return {
      ...v,
      links: [
        ...v.links,
        { id: "00000000-0000-4000-8000-0000000000a1", type: "website" as const, label: "Site", target, enabled },
      ],
    };
  };

  it("refuses a link that is not https, tel or wa.me, even as a draft", async () => {
    const r = await saveDraft(f.store, null, withWebsite("javascript:alert(1)"), "a@b.c");
    assert.equal(r.ok, false);
    assert.equal(f.shops.size, 0);
  });

  it("lets a draft keep an empty enabled button but blocks publishing it", async () => {
    assert.equal((await saveDraft(f.store, null, withWebsite(""), "a@b.c")).ok, true);
    const r = await publishShop(f.store, null, withWebsite(""), "a@b.c");
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /"Site" is on but has no link/);
  });

  it("publishes once the empty button is switched off", async () => {
    assert.equal((await publishShop(f.store, null, withWebsite("", false), "a@b.c")).ok, true);
  });

  it("fills call and WhatsApp targets from the phone numbers", async () => {
    const r = await publishShop(f.store, null, values({}, { waMessage: "Hello" }), "a@b.c");
    assert.ok(r.ok);
    const targets = r.links.map((l) => l.target);
    assert.deepEqual(targets.sort(), ["https://wa.me/919820012345?text=Hello", "tel:+919820012345"]);
    assert.equal(f.store.links.get(r.id)?.length, 2);
  });

  it("returns cleaned-up targets, such as an Instagram handle as a link", async () => {
    const v = values();
    const r = await saveDraft(
      f.store,
      null,
      { ...v, links: [...v.links, { id: "00000000-0000-4000-8000-0000000000a2", type: "instagram", label: "IG", target: "@velvet", enabled: true }] },
      "a@b.c",
    );
    assert.ok(r.ok);
    assert.equal(r.links.find((l) => l.type === "instagram")?.target, "https://instagram.com/velvet");
  });

  it("blocks a button colour that fails 4.5:1 on the chosen theme, and says why", async () => {
    const r = await saveDraft(f.store, null, values({ buttonColor: "#FFB547" }), "a@b.c");
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : "", /contrast is \d\.\d:1, below the 4\.5:1/);
    const ok = await saveDraft(f.store, null, values({ buttonColor: "#9F1D45" }), "a@b.c");
    assert.equal(ok.ok, true);
  });

  it("rejects a malformed phone number", async () => {
    const r = await saveDraft(f.store, null, values({}, { phone: "call me" }), "a@b.c");
    assert.equal(r.ok, false);
  });

  it("rejects input that does not match the form's shape", async () => {
    for (const bad of [null, "x", { ...values(), look: { theme: "neon", layout: "list", font: "clean" } }, { ...values(), buttonColor: "red" }]) {
      assert.equal((await saveDraft(f.store, null, bad, "a@b.c")).ok, false);
    }
  });
});

describe("new shop data", () => {
  it("starts empty with the starter buttons and no id", () => {
    const d = newShopData();
    assert.equal(d.id, null);
    assert.equal(d.values.details.name, "");
    assert.equal(d.values.links.length, 7);
    assert.equal(d.values.links.find((l) => l.type === "menu")?.enabled, false);
  });
});
