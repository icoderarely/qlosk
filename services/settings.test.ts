import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanQrBase, cleanWhatsapp, getSettings, getShopTypes, saveSettings, type SettingsStore } from "./settings.ts";

function fake(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  const saves: { values: Record<string, unknown>; what: string; userEmail: string }[] = [];
  const store: SettingsStore = {
    async get(key) {
      return data.get(key) ?? null;
    },
    async save(args) {
      saves.push(args);
      for (const [k, v] of Object.entries(args.values)) data.set(k, v);
    },
  };
  return { store, saves };
}

const ALL_THEMES = { daylight: true, nightfall: true, marigold: true, blush: true, graphite: true };
const ALL_LAYOUTS = { list: true, tiles: true, cover: true, index: true, chat: true };
const FILTERS = { crawlers: true, token: true, dedupe: true, rateLimit: true, spikes: true };
const SUGGESTIONS = {
  "Salon and spa": { theme: "blush", layout: "list" },
  Clinic: { theme: "daylight", layout: "list" },
  Gym: { theme: "nightfall", layout: "index" },
  "Cafe and bakery": { theme: "marigold", layout: "tiles" },
  Jeweller: { theme: "graphite", layout: "cover" },
  Boutique: null,
};
const form = (extra: Record<string, unknown> = {}) => ({
  themes: ALL_THEMES,
  layouts: ALL_LAYOUTS,
  filtering: FILTERS,
  suggestions: SUGGESTIONS,
  ...extra,
});
const owner = { canEditDomain: true, userEmail: "owner@example.com" };

describe("getSettings", () => {
  it("falls back to everything on and the starting suggestions", async () => {
    const s = await getSettings(fake().store);
    assert.deepEqual(s.enabledThemes, ALL_THEMES);
    assert.deepEqual(s.enabledLayouts, ALL_LAYOUTS);
    assert.ok(s.filtering.every((f) => f.enabled));
    assert.deepEqual(s.shopTypes.find((t) => t.label === "Salon and spa")?.suggested, { theme: "blush", layout: "list" });
    assert.deepEqual(s.domain, { qrBase: "", whatsappSender: "" });
  });

  it("reads what was saved, including a suggestion removed on purpose", async () => {
    const s = await getSettings(
      fake({
        themes: { ...ALL_THEMES, nightfall: false },
        filtering: { ...FILTERS, spikes: false },
        shop_types: { Gym: null, Clinic: { theme: "graphite", layout: "tiles" } },
        domain: { qrBase: "https://shop.example.in", whatsappSender: "919820012345" },
      }).store,
    );
    assert.equal(s.enabledThemes.nightfall, false);
    assert.equal(s.filtering.find((f) => f.id === "spikes")?.enabled, false);
    assert.equal(s.shopTypes.find((t) => t.label === "Gym")?.suggested, null);
    assert.deepEqual(s.shopTypes.find((t) => t.label === "Clinic")?.suggested, { theme: "graphite", layout: "tiles" });
    assert.equal(s.domain.qrBase, "https://shop.example.in");
  });

  it("ignores a saved value that is not valid", async () => {
    const types = await getShopTypes(fake({ shop_types: { Gym: { theme: "neon", layout: "list" } } }).store);
    assert.equal(types.find((t) => t.label === "Gym")?.suggested, null);
    const s = await getSettings(fake({ themes: "broken", domain: 7 }).store);
    assert.deepEqual(s.enabledThemes, ALL_THEMES);
  });
});

describe("cleanQrBase and cleanWhatsapp", () => {
  it("accepts an https origin and drops a trailing slash", () => {
    assert.equal(cleanQrBase("https://shop.example.in/"), "https://shop.example.in");
    assert.equal(cleanQrBase("  https://shop.example.in "), "https://shop.example.in");
    assert.equal(cleanQrBase(""), "");
    assert.equal(cleanQrBase("http://localhost:3000"), "http://localhost:3000");
  });
  it("refuses anything that would make a bad QR code", () => {
    for (const bad of ["shop.example.in", "http://shop.example.in", "https://shop.example.in/q", "https://shop.example.in?x=1", "https://user:pw@shop.example.in", "https://intranet", "javascript:alert(1)"]) {
      assert.equal(cleanQrBase(bad), null, bad);
    }
  });
  it("turns a phone number into digits with the country code", () => {
    assert.equal(cleanWhatsapp("98200 12345"), "919820012345");
    assert.equal(cleanWhatsapp(""), "");
    assert.equal(cleanWhatsapp("12"), null);
  });
});

describe("saveSettings", () => {
  it("saves every key and logs what changed", async () => {
    const f = fake();
    const result = await saveSettings(
      f.store,
      form({
        themes: { ...ALL_THEMES, graphite: false },
        suggestions: { ...SUGGESTIONS, Jeweller: null },
        filtering: { ...FILTERS, rateLimit: false },
        domain: { qrBase: "https://shop.example.in/", whatsappSender: "98200 12345" },
      }),
      owner,
    );
    assert.deepEqual(result, { ok: true, message: "Settings saved." });
    assert.equal(f.saves.length, 1);
    assert.equal(f.saves[0].what, "Settings changed: themes, suggested looks, traffic filtering, QR address, WhatsApp number");
    assert.deepEqual(f.saves[0].values.domain, { qrBase: "https://shop.example.in", whatsappSender: "919820012345" });
    assert.equal((f.saves[0].values.themes as Record<string, boolean>).graphite, false);
  });

  it("writes nothing when nothing changed", async () => {
    const f = fake();
    assert.deepEqual(await saveSettings(f.store, form(), owner), { ok: true, message: "No changes to save." });
    assert.equal(f.saves.length, 0);
  });

  it("keeps at least one theme and one layout on", async () => {
    const f = fake();
    const noThemes = await saveSettings(f.store, form({ themes: { daylight: false, nightfall: false, marigold: false, blush: false, graphite: false } }), owner);
    assert.equal(noThemes.ok, false);
    const noLayouts = await saveSettings(f.store, form({ layouts: { list: false, tiles: false, cover: false, index: false, chat: false } }), owner);
    assert.equal(noLayouts.ok, false);
    assert.equal(f.saves.length, 0);
  });

  it("does not suggest a theme or layout that is turned off", async () => {
    const f = fake();
    const result = await saveSettings(f.store, form({ themes: { ...ALL_THEMES, blush: false } }), owner);
    assert.deepEqual(result, { ok: false, error: "The suggested look for Salon and spa uses a theme or layout that is turned off." });
    assert.equal(f.saves.length, 0);
  });

  it("rejects an unknown theme, an unknown shop type and a bad domain", async () => {
    const f = fake();
    assert.equal((await saveSettings(f.store, form({ suggestions: { ...SUGGESTIONS, Gym: { theme: "neon", layout: "list" } } }), owner)).ok, false);
    assert.equal((await saveSettings(f.store, form({ suggestions: { ...SUGGESTIONS, Pirate: null } }), owner)).ok, false);
    const bad = await saveSettings(f.store, form({ domain: { qrBase: "http://evil.example", whatsappSender: "" } }), owner);
    assert.equal(bad.ok, false);
    const badPhone = await saveSettings(f.store, form({ domain: { qrBase: "", whatsappSender: "12" } }), owner);
    assert.equal(badPhone.ok, false);
    assert.equal(f.saves.length, 0);
  });

  it("ignores the QR address and WhatsApp number from anyone but the owner", async () => {
    const f = fake({ domain: { qrBase: "https://shop.example.in", whatsappSender: "919820012345" } });
    const result = await saveSettings(
      f.store,
      form({ filtering: { ...FILTERS, dedupe: false }, domain: { qrBase: "https://other.example", whatsappSender: "" } }),
      { canEditDomain: false, userEmail: "admin@example.com" },
    );
    assert.equal(result.ok, true);
    assert.equal("domain" in f.saves[0].values, false);
    assert.equal((await getSettings(f.store)).domain.qrBase, "https://shop.example.in");
  });
});
