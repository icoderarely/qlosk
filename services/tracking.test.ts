import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_FILTERS,
  DUPLICATE_WINDOW_SECONDS,
  RATE_LIMIT_PER_MINUTE,
  SPIKE_MIN_SCANS_PER_HOUR,
  TAP_TOKEN_TTL_SECONDS,
  clientIp,
  dayKey,
  handleScan,
  handleTap,
  hashIp,
  isCrawler,
  isIgnoredRequest,
  isSpike,
  signTapToken,
  tapHref,
  uaFamily,
  verifyTapToken,
  type FilterSettings,
  type ScanCode,
  type TapLink,
  type TrackingStore,
} from "./tracking.ts";

const NOW = new Date("2026-10-24T06:00:00Z");
const LINK = "00000000-0000-4000-8000-000000000001";

type World = {
  filters?: Partial<FilterSettings>;
  /** Events already stored from this visitor in the last minute. */
  recent?: number;
  /** A counted event from this visitor on this target in the last 30 seconds. */
  repeat?: boolean;
  spike?: { lastHour: number; weekBefore: number };
};

function fake(code: ScanCode | null, link: TapLink | null = null, world: World = {}) {
  const scans: Record<string, unknown>[] = [];
  const taps: Record<string, unknown>[] = [];
  const held: { shopId: string; since: Date }[] = [];
  const asked: { since: Date }[] = [];
  const store: TrackingStore = {
    async findCode() { return code; },
    async recordScan(e) { scans.push(e); },
    async findTapLink() { return link; },
    async recordTap(e) { taps.push(e); },
    async filterSettings() { return { ...DEFAULT_FILTERS, ...world.filters }; },
    async countRecent() { return world.recent ?? 0; },
    async hasCountedRecent(_kind, _hash, _target, since) { asked.push({ since }); return world.repeat ?? false; },
    async spikeStats() { return world.spike ?? { lastHour: 0, weekBefore: 0 }; },
    async holdScans(shopId, since) { held.push({ shopId, since }); },
  };
  return { store, scans, taps, held, asked };
}

const visitor = { ip: "203.0.113.9", userAgent: "Mozilla/5.0 Chrome/120.0 Safari/537.36" };

describe("hashIp (no raw IPs, salt rotates daily)", () => {
  it("does not contain the address", () => {
    assert.equal(hashIp("203.0.113.9", "salt", "2026-10-24").includes("203.0.113.9"), false);
  });

  it("is stable within a day and different on another day or salt", () => {
    const a = hashIp("203.0.113.9", "salt", "2026-10-24");
    assert.equal(a, hashIp("203.0.113.9", "salt", "2026-10-24"));
    assert.notEqual(a, hashIp("203.0.113.9", "salt", "2026-10-25"));
    assert.notEqual(a, hashIp("203.0.113.9", "other", "2026-10-24"));
    assert.notEqual(a, hashIp("203.0.113.10", "salt", "2026-10-24"));
  });

  it("rolls the day over at midnight in India", () => {
    assert.equal(dayKey(new Date("2026-10-24T18:00:00Z")), "2026-10-24");
    assert.equal(dayKey(new Date("2026-10-24T19:00:00Z")), "2026-10-25");
  });

  it("takes the first address of X-Forwarded-For", () => {
    assert.equal(clientIp("203.0.113.9, 10.0.0.1"), "203.0.113.9");
    assert.equal(clientIp(null), null);
    assert.equal(clientIp(""), null);
  });
});

describe("uaFamily", () => {
  it("keeps only a coarse family", () => {
    assert.equal(uaFamily("Mozilla/5.0 (Linux; Android) Chrome/120.0 Mobile Safari/537.36"), "chrome");
    assert.equal(uaFamily("Mozilla/5.0 (iPhone) AppleWebKit Version/17 Safari/604.1"), "safari");
    assert.equal(uaFamily("WhatsApp/2.23"), "whatsapp");
    assert.equal(uaFamily(null), "unknown");
  });
});

describe("tap tokens", () => {
  const token = signTapToken("key", "7KX2M9", LINK, NOW);

  it("verify for the same code and link before they expire", () => {
    assert.equal(verifyTapToken("key", token, "7KX2M9", LINK, NOW), true);
    const later = new Date(NOW.getTime() + (TAP_TOKEN_TTL_SECONDS - 60) * 1000);
    assert.equal(verifyTapToken("key", token, "7KX2M9", LINK, later), true);
  });

  it("expire", () => {
    const later = new Date(NOW.getTime() + (TAP_TOKEN_TTL_SECONDS + 60) * 1000);
    assert.equal(verifyTapToken("key", token, "7KX2M9", LINK, later), false);
  });

  it("fail for another link, another code, another key, or tampering", () => {
    assert.equal(verifyTapToken("key", token, "7KX2M9", "00000000-0000-4000-8000-000000000002", NOW), false);
    assert.equal(verifyTapToken("key", token, "R4PD8T", LINK, NOW), false);
    assert.equal(verifyTapToken("other", token, "7KX2M9", LINK, NOW), false);
    const [exp, sig] = token.split(".");
    assert.equal(verifyTapToken("key", `${(parseInt(exp, 36) + 99999).toString(36)}.${sig}`, "7KX2M9", LINK, NOW), false);
    for (const bad of [null, "", "x", "a.b.c", `${exp}.`]) {
      assert.equal(verifyTapToken("key", bad, "7KX2M9", LINK, NOW), false, String(bad));
    }
  });
});

describe("handleScan", () => {
  it("logs the scan and redirects to the shop of an assigned code", async () => {
    const { store, scans } = fake({ status: "assigned", shopId: "s1", liveSlug: "velvet" });
    const out = await handleScan(store, "7kx2m9", visitor, "salt", NOW);
    assert.deepEqual(out, { kind: "redirect", slug: "velvet" });
    assert.equal(scans.length, 1);
    const e = scans[0] as { code: string; shopId: string; ipHash: string; uaFamily: string };
    assert.deepEqual([e.code, e.shopId, e.uaFamily], ["7KX2M9", "s1", "chrome"]);
    assert.equal(e.ipHash, hashIp("203.0.113.9", "salt", "2026-10-24"));
    assert.deepEqual([scans[0].isBot, scans[0].botReason], [false, null]);
  });

  it("with defer, answers first and logs the same scan afterwards", async () => {
    const { store, scans } = fake({ status: "assigned", shopId: "s1", liveSlug: "velvet" });
    const queued: (() => Promise<void>)[] = [];
    const out = await handleScan(store, "7kx2m9", visitor, "salt", NOW, (work) => queued.push(work));
    assert.deepEqual(out, { kind: "redirect", slug: "velvet" });
    assert.equal(scans.length, 0);
    assert.equal(queued.length, 1);
    await queued[0]();
    assert.equal(scans.length, 1);
    assert.deepEqual([scans[0].isBot, scans[0].botReason], [false, null]);
  });

  it("never stores a raw IP, and stores no hash when there is no salt", async () => {
    const { store, scans } = fake({ status: "assigned", shopId: "s1", liveSlug: "velvet" });
    await handleScan(store, "7KX2M9", visitor, null, NOW);
    assert.equal((scans[0] as { ipHash: unknown }).ipHash, null);
    assert.equal(JSON.stringify(scans).includes("203.0.113.9"), false);
  });

  it("shows the not-activated page for a code in stock, and still logs the scan", async () => {
    const { store, scans } = fake({ status: "unassigned", shopId: null, liveSlug: null });
    assert.deepEqual(await handleScan(store, "7KX2M9", visitor, "s", NOW), { kind: "inactive" });
    assert.equal((scans[0] as { shopId: unknown }).shopId, null);
  });

  it("does the same for a shop that is not live (unpublished, paused)", async () => {
    const { store } = fake({ status: "assigned", shopId: "s1", liveSlug: null });
    assert.deepEqual(await handleScan(store, "7KX2M9", visitor, "s", NOW), { kind: "inactive" });
  });

  it("ignores codes that are malformed or unknown, without logging", async () => {
    const unknown = fake(null);
    assert.deepEqual(await handleScan(unknown.store, "7KX2M9", visitor, "s", NOW), { kind: "inactive" });
    const bad = fake({ status: "assigned", shopId: "s1", liveSlug: "x" });
    for (const code of ["", "OOOOOO", "../admin", "7KX2M9X"]) {
      assert.deepEqual(await handleScan(bad.store, code, visitor, "s", NOW), { kind: "inactive" }, code);
    }
    assert.equal(unknown.scans.length + bad.scans.length, 0);
  });

  it("still redirects when logging fails", async () => {
    const { store } = fake({ status: "assigned", shopId: "s1", liveSlug: "velvet" });
    store.recordScan = async () => { throw new Error("db down"); };
    assert.deepEqual(await handleScan(store, "7KX2M9", visitor, "s", NOW), { kind: "redirect", slug: "velvet" });
  });
});

describe("handleTap", () => {
  const keys = { tokenKey: "key", salt: "salt" };
  const link: TapLink = { shopId: "s1", linkId: LINK, type: "website", target: "https://example.com/menu", enabled: true };
  const good = signTapToken("key", "7KX2M9", LINK, NOW);

  it("logs a tap with a good token and sends the visitor to the target", async () => {
    const { store, taps } = fake(null, link);
    const out = await handleTap(store, "7KX2M9", LINK, good, visitor, keys, NOW);
    assert.deepEqual(out, { kind: "redirect", target: "https://example.com/menu" });
    assert.equal(taps.length, 1);
    assert.deepEqual((taps[0] as { shopId: string; linkId: string }).linkId, LINK);
    assert.deepEqual([taps[0].isBot, taps[0].botReason], [false, null]);
  });

  it("still sends the visitor on, but stores the tap as no_token, without a valid token", async () => {
    for (const token of [null, "bad.token", signTapToken("other", "7KX2M9", LINK, NOW)]) {
      const { store, taps } = fake(null, link);
      const out = await handleTap(store, "7KX2M9", LINK, token, visitor, keys, NOW);
      assert.equal(out.kind, "redirect");
      assert.equal(taps.length, 1, String(token));
      assert.deepEqual([taps[0].isBot, taps[0].botReason], [true, "no_token"]);
    }
  });

  it("returns not found when the link is not on that code's shop, is off, or is Wi-Fi", async () => {
    for (const l of [null, { ...link, enabled: false }, { ...link, type: "wifi" as const, target: "wifi" }]) {
      const { store, taps } = fake(null, l);
      assert.deepEqual(await handleTap(store, "7KX2M9", LINK, good, visitor, keys, NOW), { kind: "notfound" });
      assert.equal(taps.length, 0);
    }
  });

  it("never redirects to a target that is not https or tel, whatever is stored", async () => {
    for (const target of ["javascript:alert(1)", "http://example.com", "data:text/html,x", "//evil.example"]) {
      const { store } = fake(null, { ...link, target });
      assert.deepEqual(await handleTap(store, "7KX2M9", LINK, good, visitor, keys, NOW), { kind: "notfound" }, target);
    }
  });

  it("passes tel: targets through", async () => {
    const { store } = fake(null, { ...link, type: "call", target: "tel:+919820012345" });
    assert.deepEqual(await handleTap(store, "7KX2M9", LINK, good, visitor, keys, NOW), { kind: "redirect", target: "tel:+919820012345" });
  });

  it("rejects malformed codes and link ids before any lookup", async () => {
    const { store } = fake(null, link);
    assert.deepEqual(await handleTap(store, "nope", LINK, good, visitor, keys, NOW), { kind: "notfound" });
    assert.deepEqual(await handleTap(store, "7KX2M9", "../x", good, visitor, keys, NOW), { kind: "notfound" });
  });
});

describe("tapHref", () => {
  it("builds the /r address with the token", () => {
    assert.equal(tapHref("7KX2M9", LINK, "a.b"), `/r/7KX2M9/${LINK}?t=a.b`);
  });
});

// ---- Bot filtering (spec section 7) -------------------------------------------

const ASSIGNED: ScanCode = { status: "assigned", shopId: "s1", liveSlug: "velvet" };
const CURL = { ip: "203.0.113.9", userAgent: "curl/8.4.0" };
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

describe("crawler check", () => {
  it("knows crawlers, link previews, scripts and a missing user agent", () => {
    for (const ua of [GOOGLEBOT, "curl/8.4.0", "WhatsApp/2.23.20 A", "facebookexternalhit/1.1", "Twitterbot/1.0", "TelegramBot (like TwitterBot)", "Slackbot-LinkExpanding 1.0", null, "", "   "]) {
      assert.equal(isCrawler(ua), true, String(ua));
    }
  });
  it("does not flag real phone browsers, including in-app browsers", () => {
    for (const ua of [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0 Mobile Safari/537.36 Instagram 310.0",
    ]) {
      assert.equal(isCrawler(ua), false, ua);
    }
  });

  it("stores a bot-agent scan as is_bot with reason crawler, and still redirects", async () => {
    const { store, scans } = fake(ASSIGNED);
    const out = await handleScan(store, "7KX2M9", CURL, "salt", NOW);
    assert.deepEqual(out, { kind: "redirect", slug: "velvet" });
    assert.equal(scans.length, 1);
    assert.deepEqual([scans[0].isBot, scans[0].botReason], [true, "crawler"]);
  });
  it("flags a crawler tap even with a good token", async () => {
    const link: TapLink = { shopId: "s1", linkId: LINK, type: "website", target: "https://example.com", enabled: true };
    const { store, taps } = fake(null, link);
    await handleTap(store, "7KX2M9", LINK, signTapToken("key", "7KX2M9", LINK, NOW), { ...CURL, userAgent: GOOGLEBOT }, { tokenKey: "key", salt: "s" }, NOW);
    assert.deepEqual([taps[0].isBot, taps[0].botReason], [true, "crawler"]);
  });
  it("counts the scan when the switch is off", async () => {
    const { store, scans } = fake(ASSIGNED, null, { filters: { crawlers: false } });
    await handleScan(store, "7KX2M9", CURL, "salt", NOW);
    assert.equal(scans[0].isBot, false);
  });
});

describe("ignored requests (HEAD and prefetch)", () => {
  const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });
  it("recognises HEAD and the prefetch headers", () => {
    assert.equal(isIgnoredRequest("HEAD", h({})), true);
    assert.equal(isIgnoredRequest("GET", h({ "sec-purpose": "prefetch" })), true);
    assert.equal(isIgnoredRequest("GET", h({ "sec-purpose": "prefetch;prerender" })), true);
    assert.equal(isIgnoredRequest("GET", h({ purpose: "prefetch" })), true);
    assert.equal(isIgnoredRequest("GET", h({ "x-moz": "prefetch" })), true);
    assert.equal(isIgnoredRequest("GET", h({ "next-router-prefetch": "1" })), true);
  });
  it("lets an ordinary GET through", () => {
    assert.equal(isIgnoredRequest("GET", h({})), false);
  });
  it("does not log a scan or tap marked skipLog, but still answers", async () => {
    const s = fake(ASSIGNED);
    assert.deepEqual(await handleScan(s.store, "7KX2M9", { ...visitor, skipLog: true }, "salt", NOW), { kind: "redirect", slug: "velvet" });
    assert.equal(s.scans.length, 0);
    const link: TapLink = { shopId: "s1", linkId: LINK, type: "website", target: "https://example.com", enabled: true };
    const t = fake(null, link);
    const out = await handleTap(t.store, "7KX2M9", LINK, null, { ...visitor, skipLog: true }, { tokenKey: "key", salt: "s" }, NOW);
    assert.equal(out.kind, "redirect");
    assert.equal(t.taps.length, 0);
  });
});

describe("missing tap token", () => {
  const link: TapLink = { shopId: "s1", linkId: LINK, type: "website", target: "https://example.com", enabled: true };
  it("is counted when the switch is off", async () => {
    const { store, taps } = fake(null, link, { filters: { token: false } });
    await handleTap(store, "7KX2M9", LINK, null, visitor, { tokenKey: "key", salt: "s" }, NOW);
    assert.equal(taps[0].isBot, false);
  });
});

describe("duplicate rule", () => {
  it("flags the same device on the same target within 30 seconds", async () => {
    const { store, scans, asked } = fake(ASSIGNED, null, { repeat: true });
    await handleScan(store, "7KX2M9", visitor, "salt", NOW);
    assert.deepEqual([scans[0].isBot, scans[0].botReason], [true, "duplicate"]);
    assert.equal(asked[0].since.getTime(), NOW.getTime() - DUPLICATE_WINDOW_SECONDS * 1000);
  });
  it("flags a repeated tap the same way", async () => {
    const link: TapLink = { shopId: "s1", linkId: LINK, type: "website", target: "https://example.com", enabled: true };
    const { store, taps } = fake(null, link, { repeat: true });
    await handleTap(store, "7KX2M9", LINK, signTapToken("key", "7KX2M9", LINK, NOW), visitor, { tokenKey: "key", salt: "s" }, NOW);
    assert.deepEqual([taps[0].isBot, taps[0].botReason], [true, "duplicate"]);
  });
  it("counts a first visit, and does not check without a visitor hash", async () => {
    const first = fake(ASSIGNED);
    await handleScan(first.store, "7KX2M9", visitor, "salt", NOW);
    assert.equal(first.scans[0].isBot, false);
    const noHash = fake(ASSIGNED, null, { repeat: true });
    await handleScan(noHash.store, "7KX2M9", visitor, null, NOW);
    assert.equal(noHash.scans[0].isBot, false);
    assert.equal(noHash.asked.length, 0);
  });
  it("counts the repeat when the switch is off", async () => {
    const { store, scans } = fake(ASSIGNED, null, { repeat: true, filters: { dedupe: false } });
    await handleScan(store, "7KX2M9", visitor, "salt", NOW);
    assert.equal(scans[0].isBot, false);
  });
});

describe("rate limit", () => {
  it("flags the request that goes over the per-minute limit", async () => {
    const { store, scans } = fake(ASSIGNED, null, { recent: RATE_LIMIT_PER_MINUTE });
    await handleScan(store, "7KX2M9", visitor, "salt", NOW);
    assert.deepEqual([scans[0].isBot, scans[0].botReason], [true, "rate_limit"]);
  });
  it("lets the request just under the limit through", async () => {
    const { store, scans } = fake(ASSIGNED, null, { recent: RATE_LIMIT_PER_MINUTE - 1 });
    await handleScan(store, "7KX2M9", visitor, "salt", NOW);
    assert.equal(scans[0].isBot, false);
  });
  it("applies to taps, and wins over the duplicate rule", async () => {
    const link: TapLink = { shopId: "s1", linkId: LINK, type: "website", target: "https://example.com", enabled: true };
    const { store, taps } = fake(null, link, { recent: 99, repeat: true });
    await handleTap(store, "7KX2M9", LINK, signTapToken("key", "7KX2M9", LINK, NOW), visitor, { tokenKey: "key", salt: "s" }, NOW);
    assert.equal(taps[0].botReason, "rate_limit");
  });
  it("is off when the switch is off", async () => {
    const { store, scans } = fake(ASSIGNED, null, { recent: 999, filters: { rateLimit: false } });
    await handleScan(store, "7KX2M9", visitor, "salt", NOW);
    assert.equal(scans[0].isBot, false);
  });
});

describe("spike review", () => {
  it("is a spike only well above both the floor and the shop's normal rate", () => {
    assert.equal(isSpike(SPIKE_MIN_SCANS_PER_HOUR, 0), false);
    assert.equal(isSpike(SPIKE_MIN_SCANS_PER_HOUR + 1, 0), true);
    // normal: 2400 scans in the week before = about 14 an hour, so 10x is about 143
    assert.equal(isSpike(100, 2400), false);
    assert.equal(isSpike(150, 2400), true);
  });
  it("holds the scan and the hour's earlier scans for review", async () => {
    const { store, scans, held } = fake(ASSIGNED, null, { spike: { lastHour: SPIKE_MIN_SCANS_PER_HOUR, weekBefore: 0 } });
    await handleScan(store, "7KX2M9", visitor, "salt", NOW);
    assert.deepEqual([scans[0].isBot, scans[0].botReason], [true, "spike_review"]);
    assert.deepEqual(held.map((h) => [h.shopId, h.since.getTime()]), [["s1", NOW.getTime() - 3600_000]]);
  });
  it("counts a normal scan and holds nothing", async () => {
    const { store, scans, held } = fake(ASSIGNED, null, { spike: { lastHour: 5, weekBefore: 100 } });
    await handleScan(store, "7KX2M9", visitor, "salt", NOW);
    assert.equal(scans[0].isBot, false);
    assert.equal(held.length, 0);
  });
  it("ignores scans of codes with no shop, and the switch", async () => {
    const stock = fake({ status: "unassigned", shopId: null, liveSlug: null }, null, { spike: { lastHour: 999, weekBefore: 0 } });
    await handleScan(stock.store, "7KX2M9", visitor, "salt", NOW);
    assert.equal(stock.scans[0].isBot, false);
    const off = fake(ASSIGNED, null, { spike: { lastHour: 999, weekBefore: 0 }, filters: { spikes: false } });
    await handleScan(off.store, "7KX2M9", visitor, "salt", NOW);
    assert.equal(off.scans[0].isBot, false);
  });
});
