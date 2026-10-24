import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_CHOICES, DESIGN_INFO, STANDEE_DESIGNS, initialsOf, resolveHeadline, resolveStandeeTheme, standeeItems } from "../components/standee/types.ts";
import { testShop } from "./print-test-helpers.ts";
import { buildQrArt, qrTarget } from "./qr-art.ts";
import { type StandeeStore, normalizeChoices, parseChoices, saveStandeeChoices, standeeButtons, standeeContent, standeeInput } from "./standee.ts";

const art = buildQrArt(qrTarget("https://qlosk.com", "7KX2M9"));
const ok = { design: "ticket", theme: "marigold", headline: "Scan for our menu", size: "A4" };

describe("standee choices", () => {
  it("accepts a valid set", () => {
    assert.deepEqual(parseChoices(ok), { ok: true, value: ok });
  });
  it("a headline must be under 40 characters", () => {
    assert.equal(parseChoices({ ...ok, headline: "x".repeat(39) }).ok, true);
    const long = parseChoices({ ...ok, headline: "x".repeat(40) });
    assert.equal(long.ok, false);
    assert.match(long.ok ? "" : long.error, /under 40/);
  });
  it("only the three designs, the light themes and A5 or A4", () => {
    assert.equal(parseChoices({ ...ok, design: "banner" }).ok, false);
    assert.equal(parseChoices({ ...ok, theme: "nightfall" }).ok, false);
    assert.equal(parseChoices({ ...ok, size: "A3" }).ok, false);
    assert.equal(parseChoices({ ...ok, theme: "match" }).ok, true);
  });
  it("stored values that are not valid fall back to the defaults", () => {
    assert.deepEqual(normalizeChoices({ design: "x", theme: "y", headline: "", size: "z" }), DEFAULT_CHOICES);
    assert.equal(normalizeChoices({ headline: "x".repeat(60) }).headline.length, 39);
  });
  it("saving validates, then writes through the store", async () => {
    const calls: unknown[] = [];
    const store: StandeeStore = { async saveChoices(id, c, who) { calls.push([id, c, who]); return true; } };
    assert.equal((await saveStandeeChoices(store, "s1", { ...ok, design: "nope" }, "a@b.in")).ok, false);
    assert.equal(calls.length, 0);
    const done = await saveStandeeChoices(store, "s1", ok, "a@b.in");
    assert.equal(done.ok, true);
    assert.deepEqual(calls, [["s1", ok, "a@b.in"]]);
    const gone = await saveStandeeChoices({ saveChoices: async () => false }, "s1", ok, "a@b.in");
    assert.deepEqual(gone, { ok: false, error: "Unknown shop." });
  });
});

describe("standee colour", () => {
  it("match follows the shop page, and nightfall prints as daylight", () => {
    assert.equal(resolveStandeeTheme("match", "blush"), "blush");
    assert.equal(resolveStandeeTheme("match", "graphite"), "graphite");
    assert.equal(resolveStandeeTheme("match", "nightfall"), "daylight");
    assert.equal(resolveStandeeTheme("marigold", "nightfall"), "marigold");
  });
});

describe("standee words", () => {
  it("each design has its default headline", () => {
    assert.equal(DESIGN_INFO.arch.headline, "Everything about us, one scan");
    assert.equal(DESIGN_INFO.ticket.headline, "Your shortcut to everything here");
    assert.equal(DESIGN_INFO.badge.headline, "One scan. Everything here.");
    for (const d of STANDEE_DESIGNS) assert.equal(resolveHeadline(d, "  "), DESIGN_INFO[d].headline);
    assert.equal(resolveHeadline("arch", " Hello "), "Hello");
  });
  it("initials are the first letters of the first two words", () => {
    assert.equal(initialsOf("Velvet Salon & Spa"), "VS");
    assert.equal(initialsOf("kaveri"), "K");
    assert.equal(initialsOf("& $"), "S");
    assert.equal(initialsOf("कावेरी मिठाई"), "का".slice(0, 1) + "म");
  });
});

describe("standee content comes from the shop", () => {
  it("shows an icon for each enabled button that has something to open", () => {
    const shop = testShop();
    const buttons = standeeButtons(shop);
    assert.deepEqual(buttons.map((b) => b.type), ["whatsapp", "call", "google_review", "wifi", "maps", "instagram"]);
    // Off, empty and Wi-Fi without a network are left off, like the live page.
    shop.links = shop.links.map((l) => (l.type === "call" ? { ...l, enabled: false } : l.type === "maps" ? { ...l, target: "" } : l));
    shop.wifi = { enabled: false, network: "", password: "" };
    assert.deepEqual(standeeButtons(shop).map((b) => b.type), ["whatsapp", "google_review", "instagram"]);
  });
  it("uses the design's wording and caps the list at five", () => {
    const items = standeeItems([{ type: "call", label: "" }, { type: "whatsapp", label: "" }, { type: "google_review", label: "" }, { type: "wifi", label: "" }, { type: "maps", label: "" }, { type: "instagram", label: "" }], true);
    assert.equal(items.length, 5);
    assert.deepEqual(items.map((i) => i.short), ["Call", "WhatsApp", "Review us", "Free Wi-Fi", "Directions"]);
    assert.equal(items[2].long, "Review us on Google");
    assert.equal(items[1].long, "Chat or order on WhatsApp");
  });
  it("adds the offer when it is on", () => {
    const shop = testShop();
    shop.links = shop.links.filter((l) => l.type === "call");
    shop.wifi.enabled = false;
    shop.offer = { enabled: true, title: "10% off", code: "", note: "", validUntil: "" };
    const content = standeeContent(shop, DEFAULT_CHOICES, art);
    assert.deepEqual(content.items.map((i) => i.type), ["call", "offer"]);
    assert.equal(content.items[1].long, "See today's offer");
  });
  it("name, tagline, logo and the headline follow the shop and the choices", () => {
    const shop = testShop({ name: "  Kaveri Sweets ", tagline: "Mithai since 1986", logoUrl: "https://example.com/l.png" });
    const content = standeeContent(shop, { ...DEFAULT_CHOICES, design: "badge" }, art, "data:image/png;base64,AAAA");
    assert.equal(content.shopName, "Kaveri Sweets");
    assert.equal(content.tagline, "Mithai since 1986");
    assert.equal(content.initials, "KS");
    assert.equal(content.headline, "One scan. Everything here.");
    assert.equal(content.logoSrc, "data:image/png;base64,AAAA");
    assert.equal(content.art.url, "https://qlosk.com/q/7KX2M9");
  });
  it("the font follows the shop page font and nightfall prints as daylight", () => {
    const shop = testShop({}, "rounded");
    shop.look.theme = "nightfall";
    const input = standeeInput(shop, DEFAULT_CHOICES, art);
    assert.equal(input.font, "rounded");
    assert.equal(input.theme, "daylight");
  });
});
