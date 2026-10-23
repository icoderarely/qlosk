import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPublic, lookupPublicPage, redirectFor, routeFor, toPageProps, type PublicStore } from "./public-page.ts";
import { newShopValues, toConfig, type StoredShop } from "./shop-editor.ts";

function shop(extra: Partial<StoredShop> = {}, publish = true): StoredShop {
  const v = newShopValues();
  v.details.name = "Velvet Salon";
  v.details.tagline = "Hair and skin";
  v.details.ownerName = "Asha Private";
  v.details.notes = "secret note";
  v.look = { theme: "blush", layout: "cover", font: "editorial" };
  v.links = [
    { id: "00000000-0000-4000-8000-000000000001", type: "call", label: "Call us", target: "tel:+919820012345", enabled: true },
    { id: "00000000-0000-4000-8000-000000000002", type: "maps", label: "Directions", target: "", enabled: true },
    { id: "00000000-0000-4000-8000-000000000003", type: "website", label: "Site", target: "https://example.com", enabled: false },
    { id: "00000000-0000-4000-8000-000000000004", type: "wifi", label: "Wi-Fi", target: "wifi", enabled: true },
  ];
  v.wifi = { enabled: true, network: "Velvet", password: "pw" };
  const config = toConfig(v, v.links);
  return {
    id: "s1", slug: "velvet", name: "Velvet Salon", tagline: null, shopType: null, area: null, city: null,
    address: null, phone: null, whatsapp: null, waMessage: null, logoUrl: null, coverUrl: null,
    status: "live", ownerName: "Asha Private", ownerWhatsapp: null, notes: "secret note", code: null,
    planName: null, planMonths: null, planStartedAt: null, planEndsAt: null,
    draft: config, published: publish ? config : null, publishedAt: null, ...extra,
  };
}

function store(shops: StoredShop[], history: Record<string, string> = {}): PublicStore {
  return {
    async findBySlug(slug) {
      return shops.find((s) => s.slug === slug) ?? null;
    },
    async isLive(slug) {
      const s = shops.find((x) => x.slug === slug);
      return !!s && isPublic(s);
    },
    async currentSlugForOld(old) {
      return history[old] ?? null;
    },
  };
}

describe("lookupPublicPage", () => {
  it("shows the published page for a current slug", async () => {
    const r = await lookupPublicPage(store([shop()]), "velvet");
    assert.equal(r.kind, "page");
    if (r.kind !== "page") return;
    assert.equal(r.title, "Velvet Salon");
    assert.deepEqual([r.props.theme, r.props.layout, r.props.font], ["blush", "cover", "editorial"]);
  });

  it("is not case sensitive", async () => {
    assert.equal((await lookupPublicPage(store([shop()]), "VELVET")).kind, "page");
  });

  it("redirects an old slug to the shop's current one", async () => {
    const r = await lookupPublicPage(store([shop()], { "velvet-old": "velvet" }), "velvet-old");
    assert.deepEqual(r, { kind: "redirect", slug: "velvet" });
  });

  it("follows a chain of renames straight to the latest slug", async () => {
    const s = store([shop({ slug: "velvet-c" })], { "velvet-a": "velvet-c", "velvet-b": "velvet-c" });
    assert.deepEqual(await lookupPublicPage(s, "velvet-a"), { kind: "redirect", slug: "velvet-c" });
    assert.deepEqual(await lookupPublicPage(s, "velvet-b"), { kind: "redirect", slug: "velvet-c" });
  });

  it("shows not found for an unknown slug", async () => {
    assert.deepEqual(await lookupPublicPage(store([shop()]), "nobody"), { kind: "notfound" });
  });

  it("shows not found for a shop that has never been published", async () => {
    assert.deepEqual(await lookupPublicPage(store([shop({}, false)]), "velvet"), { kind: "notfound" });
  });

  it("hides paused and archived shops", async () => {
    for (const status of ["paused", "archived"] as const) {
      assert.deepEqual(await lookupPublicPage(store([shop({ status })]), "velvet"), { kind: "notfound" }, status);
    }
  });

  it("never queries for something that cannot be a slug", async () => {
    let calls = 0;
    const s: PublicStore = {
      async findBySlug() { calls++; return null; },
      async isLive() { calls++; return false; },
      async currentSlugForOld() { calls++; return null; },
    };
    for (const bad of ["a", "../admin", "x y", "admin", "a".repeat(80), "%00"]) {
      assert.deepEqual(await lookupPublicPage(s, bad), { kind: "notfound" }, bad);
    }
    assert.equal(calls, 0);
  });
});

describe("redirectFor", () => {
  it("returns null when the slug is not an old address", async () => {
    assert.equal(await redirectFor(store([]), "velvet"), null);
  });

  it("does not redirect a slug to itself", async () => {
    assert.equal(await redirectFor(store([], { velvet: "velvet" }), "velvet"), null);
  });
});

describe("toPageProps", () => {
  it("uses the published page, not the draft", () => {
    const s = shop();
    const draft = JSON.parse(JSON.stringify(s.draft));
    draft.theme = "graphite";
    assert.equal(toPageProps({ ...s, draft }).theme, "blush");
  });

  it("leaves off buttons that are off or have nothing to open, and keeps Wi-Fi", () => {
    const p = toPageProps(shop());
    assert.deepEqual(p.links.map((l) => l.type), ["call", "wifi"]);
    assert.equal(p.links[0].href, "tel:+919820012345");
    assert.deepEqual(p.wifi, { network: "Velvet", password: "pw" });
  });

  it("carries nothing internal to the public page", () => {
    const json = JSON.stringify(toPageProps(shop()));
    assert.equal(json.includes("Asha Private"), false);
    assert.equal(json.includes("secret note"), false);
  });

  it("drops a button colour that fails contrast on the theme", () => {
    const s = shop();
    const cfg = { ...(s.published as object), buttonColor: "#FFB547", theme: "daylight" };
    assert.equal(toPageProps({ ...s, published: cfg }).buttonColor, null);
    const ok = { ...(s.published as object), buttonColor: "#9F1D45" };
    assert.equal(toPageProps({ ...s, published: ok }).buttonColor, "#9F1D45");
  });

  it("copes with a page that only has theme, layout and font (seeded shops)", () => {
    const p = toPageProps(shop({ published: { theme: "nightfall", layout: "list", font: "clean" } }));
    assert.equal(p.theme, "nightfall");
    assert.equal(p.shop.name, "Velvet Salon");
    assert.equal(p.links.length, 0);
  });
});

describe("routeFor (the HTTP answer the proxy gives)", () => {
  const s = store([shop(), shop({ slug: "draft-only" }, false), shop({ slug: "gone", status: "archived" })], {
    "velvet-old": "velvet",
  });

  it("answers page, redirect or not found", async () => {
    assert.deepEqual(await routeFor(s, "velvet"), { kind: "page" });
    assert.deepEqual(await routeFor(s, "velvet-old"), { kind: "redirect", slug: "velvet" });
    assert.deepEqual(await routeFor(s, "nobody"), { kind: "notfound" });
  });

  it("answers not found for unpublished, archived and malformed addresses", async () => {
    for (const slug of ["draft-only", "gone", "x y", "admin"]) {
      assert.deepEqual(await routeFor(s, slug), { kind: "notfound" }, slug);
    }
  });
});
