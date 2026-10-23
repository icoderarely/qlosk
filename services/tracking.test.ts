import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TAP_TOKEN_TTL_SECONDS,
  clientIp,
  dayKey,
  handleScan,
  handleTap,
  hashIp,
  signTapToken,
  tapHref,
  uaFamily,
  verifyTapToken,
  type ScanCode,
  type TapLink,
  type TrackingStore,
} from "./tracking.ts";

const NOW = new Date("2026-10-24T06:00:00Z");
const LINK = "00000000-0000-4000-8000-000000000001";

function fake(code: ScanCode | null, link: TapLink | null = null) {
  const scans: unknown[] = [];
  const taps: unknown[] = [];
  const store: TrackingStore = {
    async findCode() { return code; },
    async recordScan(e) { scans.push(e); },
    async findTapLink() { return link; },
    async recordTap(e) { taps.push(e); },
  };
  return { store, scans, taps };
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
  });

  it("still sends the visitor on, but does not log, without a valid token", async () => {
    for (const token of [null, "bad.token", signTapToken("other", "7KX2M9", LINK, NOW)]) {
      const { store, taps } = fake(null, link);
      const out = await handleTap(store, "7KX2M9", LINK, token, visitor, keys, NOW);
      assert.equal(out.kind, "redirect");
      assert.equal(taps.length, 0, String(token));
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
