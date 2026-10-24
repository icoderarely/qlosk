import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPublic, lookupPublicPage, redirectFor, routeFor, withTapLinks, toPageProps, type PublicStore } from "./public-page.ts";
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

describe("withTapLinks", () => {
  const sign = (code: string, id: string) => `tok-${code}-${id.slice(-1)}`;

  it("sends buttons through /r with a token when the shop has a code", () => {
    const props = withTapLinks(toPageProps(shop()), "7KX2M9", sign);
    const call = props.links.find((l) => l.type === "call")!;
    assert.equal(call.href, `/r/7KX2M9/${call.id}?t=tok-7KX2M9-1`);
    assert.equal(props.links.find((l) => l.type === "wifi")?.href, "#");
  });

  it("links straight to the target when there is no code", () => {
    const props = withTapLinks(toPageProps(shop()), null, sign);
    assert.equal(props.links.find((l) => l.type === "call")?.href, "tel:+919820012345");
  });
});

describe("expired plan", () => {
  const DAY = 24 * 3600_000;

  // A full page: logo, tagline, offer, Wi-Fi, banner and five buttons.
  function fullShop(extra: Partial<StoredShop>): StoredShop {
    const v = newShopValues();
    v.details = { ...v.details, name: "Velvet Salon", tagline: "Hair and skin", logoUrl: "https://example.com/logo.png", coverUrl: "https://example.com/cover.png" };
    v.links = [
      { id: "00000000-0000-4000-8000-000000000001", type: "call", label: "Call us", target: "tel:+919820012345", enabled: true },
      { id: "00000000-0000-4000-8000-000000000002", type: "maps", label: "Directions", target: "https://maps.example.com/velvet", enabled: true },
      { id: "00000000-0000-4000-8000-000000000003", type: "website", label: "Site", target: "https://example.com", enabled: true },
      { id: "00000000-0000-4000-8000-000000000004", type: "wifi", label: "Wi-Fi", target: "wifi", enabled: true },
      { id: "00000000-0000-4000-8000-000000000005", type: "instagram", label: "Instagram", target: "https://instagram.com/velvet", enabled: true },
    ];
    v.wifi = { enabled: true, network: "Velvet", password: "pw" };
    v.offer = { enabled: true, title: "10% off", code: "", note: "", validUntil: "" };
    v.banner = { enabled: true, message: "Diwali hours", period: "" };
    const config = toConfig(v, v.links);
    return shop({ draft: config, published: config, ...extra });
  }

  it("shows only the name, Call and Directions once the 15 days are over", async () => {
    const ended = fullShop({ planEndsAt: new Date(Date.now() - 40 * DAY) });
    const r = await lookupPublicPage(store([ended]), "velvet");
    assert.equal(r.kind, "page");
    if (r.kind !== "page") return;
    assert.equal(r.props.shop.name, "Velvet Salon");
    assert.equal(r.props.shop.tagline, null);
    assert.equal(r.props.shop.logoUrl, null);
    assert.equal(r.props.shop.coverUrl, null);
    assert.equal(r.props.offer, null);
    assert.equal(r.props.wifi, null);
    assert.equal(r.props.banner, null);
    assert.deepEqual(r.props.links.map((l) => l.type), ["call", "maps"]);
  });

  it("does the same for a shop whose status is expired", async () => {
    const r = await lookupPublicPage(store([fullShop({ status: "expired" })]), "velvet");
    assert.equal(r.kind === "page" && r.props.links.length, 2);
  });

  it("keeps the whole page during the 15 days", async () => {
    const r = await lookupPublicPage(store([fullShop({ planEndsAt: new Date(Date.now() - 5 * DAY) })]), "velvet");
    assert.equal(r.kind === "page" && r.props.links.length, 5);
    assert.equal(r.kind === "page" && r.props.offer?.title, "10% off");
  });

  it("keeps the tap links on the two buttons that remain", async () => {
    const r = await lookupPublicPage(store([fullShop({ planEndsAt: new Date(Date.now() - 40 * DAY), code: "ABC234" })]), "velvet");
    assert.equal(r.kind, "page");
    if (r.kind !== "page") return;
    const tapped = withTapLinks(r.props, r.code, () => "tok");
    assert.ok(tapped.links.every((l) => l.href.startsWith("/r/ABC234/")));
  });
});

describe("pages whose config holds only the look (seeded or older)", () => {
  const lookOnly = { theme: "blush", layout: "list", font: "editorial" };

  it("shows the shop's saved button rows", () => {
    const linkRows = [{ id: "00000000-0000-4000-8000-000000000009", type: "call" as const, label: "Call", target: "tel:+919800000001", enabled: true }];
    const props = toPageProps(shop({ published: lookOnly, draft: lookOnly, linkRows }));
    assert.deepEqual(props.links.map((l) => l.href), ["tel:+919800000001"]);
  });

  it("points Call and WhatsApp at the shop's own numbers when there are no rows", () => {
    const props = toPageProps(shop({ published: lookOnly, draft: lookOnly, phone: "9800000002", whatsapp: "9800000003" }));
    assert.deepEqual(props.links.map((l) => l.type), ["whatsapp", "call"]);
  });
});
