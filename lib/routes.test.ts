import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEGACY_REDIRECTS, QR_PREFIX } from "./routes.ts";

const byPath = new Map(LEGACY_REDIRECTS.map((r) => [r.source, r.destination]));

describe("legacy redirects (printed QRs and old links must keep working)", () => {
  it("sends a printed QR scan from /q/<code> to the same code under /qr", () => {
    assert.equal(byPath.get("/q/:code"), "/qr/q/:code");
  });
  it("sends the old shop page, its share card and tracked links under /qr", () => {
    assert.equal(byPath.get("/s/:slug"), "/qr/s/:slug");
    assert.equal(byPath.get("/s/:slug/og"), "/qr/s/:slug/og");
    assert.equal(byPath.get("/r/:code/:linkId"), "/qr/r/:code/:linkId");
  });
  it("sends the marketing, legal and admin pages under /qr", () => {
    for (const p of ["/playground", "/privacy", "/terms", "/refunds", "/not-activated", "/code-retired", "/admin-login"]) {
      assert.equal(byPath.get(p), `${QR_PREFIX}${p}`);
    }
    assert.equal(byPath.get("/admin/:path*"), "/qr/admin/:path*");
  });
  it("never redirects a path that is already under /qr or belongs to Mathlo", () => {
    for (const { source } of LEGACY_REDIRECTS) {
      assert.ok(!source.startsWith("/qr"), source);
      assert.ok(!source.startsWith("/mathlo"), source);
    }
  });
  it("keeps every parameter of its source in the destination", () => {
    for (const { source, destination } of LEGACY_REDIRECTS) {
      const params = source.match(/:\w+\*?/g) ?? [];
      for (const p of params) assert.ok(destination.includes(p), `${source} loses ${p}`);
    }
  });
});
