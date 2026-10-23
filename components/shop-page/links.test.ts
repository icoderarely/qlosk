import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initials, locationLine, safeHref, splitLinks } from "./links.ts";
import type { ShopLink } from "./types.ts";

const link = (id: string, type: ShopLink["type"]): ShopLink => ({
  id,
  type,
  label: id,
  href: "#",
});

describe("safeHref", () => {
  it("allows https, tel, same-site paths and #", () => {
    assert.equal(safeHref("https://maps.google.com/x"), "https://maps.google.com/x");
    assert.equal(safeHref("tel:+910000000000"), "tel:+910000000000");
    assert.equal(safeHref("/r/ABC234/id"), "/r/ABC234/id");
    assert.equal(safeHref("#"), "#");
  });

  it("blocks javascript:, data:, http: and protocol-relative URLs", () => {
    assert.equal(safeHref("javascript:alert(1)"), "#");
    assert.equal(safeHref("data:text/html,x"), "#");
    assert.equal(safeHref("http://example.com"), "#");
    assert.equal(safeHref("//evil.example"), "#");
    assert.equal(safeHref("not a url"), "#");
  });
});

describe("splitLinks", () => {
  it("makes the first WhatsApp link primary and keeps the rest in order", () => {
    const links = [link("c", "call"), link("w", "whatsapp"), link("m", "maps")];
    const { primary, rest } = splitLinks(links);
    assert.equal(primary?.id, "w");
    assert.deepEqual(rest.map((l) => l.id), ["c", "m"]);
  });

  it("falls back to Call, then to no primary", () => {
    assert.equal(splitLinks([link("m", "maps"), link("c", "call")]).primary?.id, "c");
    assert.equal(splitLinks([link("m", "maps")]).primary, null);
  });

  it("drops the Wi-Fi link when there are no Wi-Fi details", () => {
    const links = [link("w", "whatsapp"), link("f", "wifi")];
    assert.deepEqual(splitLinks(links, null).rest, []);
    const withWifi = splitLinks(links, { network: "n", password: "p" });
    assert.deepEqual(withWifi.rest.map((l) => l.id), ["f"]);
  });
});

describe("initials and locationLine", () => {
  it("takes the first letters of the first two words, skipping symbols", () => {
    assert.equal(initials("Velvet Salon & Spa"), "VS");
    assert.equal(initials("& Co"), "C");
    assert.equal(initials("sharma"), "S");
    assert.equal(initials("   "), "?");
  });

  it("joins the parts that exist", () => {
    assert.equal(locationLine("Bandra West", "Mumbai"), "Bandra West, Mumbai");
    assert.equal(locationLine(null, "Pune"), "Pune");
    assert.equal(locationLine(null, null), "");
  });
});
