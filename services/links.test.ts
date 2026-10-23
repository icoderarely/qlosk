import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  moveItem,
  normalizePhone,
  resolveLinks,
  telTarget,
  validateTarget,
  whatsappTarget,
  type LinkDraft,
} from "./links.ts";

describe("normalizePhone", () => {
  it("adds the country code to Indian numbers however they are written", () => {
    assert.equal(normalizePhone("98200 12345"), "919820012345");
    assert.equal(normalizePhone("+91 98200-12345"), "919820012345");
    assert.equal(normalizePhone("09820012345"), "919820012345");
    assert.equal(normalizePhone("919820012345"), "919820012345");
  });

  it("accepts a landline with an STD code", () => {
    assert.equal(normalizePhone("022 2345 6789"), "912223456789");
  });

  it("accepts a number from abroad only with a leading plus", () => {
    assert.equal(normalizePhone("+44 20 7946 0958"), "442079460958");
    assert.equal(normalizePhone("44 20 7946 0958"), null);
  });

  it("rejects text, short numbers and numbers starting 0 or 1", () => {
    for (const bad of ["", "call me", "12345", "1234567890", "98200 1234", "98200 12345 99"]) {
      assert.equal(normalizePhone(bad), null, bad);
    }
  });
});

describe("tel and wa.me targets", () => {
  it("builds tel: and wa.me links", () => {
    assert.equal(telTarget("98200 12345"), "tel:+919820012345");
    assert.equal(whatsappTarget("98200 12345", ""), "https://wa.me/919820012345");
  });

  it("encodes the pre-filled message", () => {
    assert.equal(
      whatsappTarget("98200 12345", "Hi, book me & a friend"),
      "https://wa.me/919820012345?text=Hi%2C%20book%20me%20%26%20a%20friend",
    );
  });
});

describe("validateTarget (only https, tel and wa.me)", () => {
  it("accepts https links", () => {
    assert.deepEqual(validateTarget("website", "https://example.com/menu"), {
      ok: true,
      value: "https://example.com/menu",
    });
  });

  it("adds https to a pasted wa.me or www link", () => {
    assert.deepEqual(validateTarget("whatsapp", "wa.me/919820012345"), {
      ok: true,
      value: "https://wa.me/919820012345",
    });
    assert.equal(validateTarget("website", "www.example.com").ok, true);
  });

  it("rejects every other scheme", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,<script>1</script>",
      "http://example.com",
      "ftp://example.com/file",
      "file:///etc/passwd",
      "//example.com",
      "https://user:pass@example.com",
      "https://localhost",
      "not a link",
    ]) {
      assert.equal(validateTarget("website", bad).ok, false, bad);
    }
  });

  it("allows a WhatsApp link only on wa.me", () => {
    assert.equal(validateTarget("whatsapp", "https://example.com/x").ok, false);
  });

  it("turns an Instagram handle into a link", () => {
    assert.deepEqual(validateTarget("instagram", "@velvet.salon"), {
      ok: true,
      value: "https://instagram.com/velvet.salon",
    });
    assert.equal(validateTarget("instagram", "javascript:alert(1)").ok, false);
  });

  it("checks a call target as a phone number", () => {
    assert.deepEqual(validateTarget("call", "tel:+919820012345"), { ok: true, value: "tel:+919820012345" });
    assert.equal(validateTarget("call", "tel:abc").ok, false);
  });

  it("treats empty as fine (the shop may not have it yet)", () => {
    assert.deepEqual(validateTarget("maps", "  "), { ok: true, value: "" });
  });
});

const link = (n: number, extra: Partial<LinkDraft> = {}): LinkDraft => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type: "website",
  label: `Link ${n}`,
  target: "",
  enabled: true,
  ...extra,
});

describe("resolveLinks", () => {
  const shop = { phone: "98200 12345", whatsapp: "98200 54321", waMessage: "Hi" };

  it("fills call and WhatsApp from the shop's numbers", () => {
    const r = resolveLinks(
      [link(1, { type: "call" }), link(2, { type: "whatsapp", target: "ignored" })],
      shop,
    );
    assert.deepEqual(r.links.map((l) => l.target), [
      "tel:+919820012345",
      "https://wa.me/919820054321?text=Hi",
    ]);
    assert.deepEqual([r.errors, r.missing], [[], []]);
  });

  it("blocks a typed target that is not allowed", () => {
    const r = resolveLinks([link(1, { target: "javascript:alert(1)" })], shop);
    assert.equal(r.errors.length, 1);
  });

  it("flags an enabled button with nothing to open, but not a disabled one", () => {
    const r = resolveLinks([link(1), link(2, { enabled: false })], shop);
    assert.equal(r.errors.length, 0);
    assert.equal(r.missing.length, 1);
    assert.match(r.missing[0], /Link 1/);
  });

  it("asks for the phone number when the Call button is on but there is none", () => {
    const r = resolveLinks([link(1, { type: "call", label: "Call us" })], { ...shop, phone: "" });
    assert.match(r.missing[0], /phone number in Details/);
  });

  it("does not block on a Wi-Fi button (the page drops it without details)", () => {
    const r = resolveLinks([link(1, { type: "wifi" })], shop);
    assert.deepEqual([r.errors, r.missing], [[], []]);
  });
});

describe("moveItem", () => {
  it("moves an item and ignores impossible moves", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 2, 1), ["a", "c", "b"]);
    const same = ["a", "b"];
    assert.equal(moveItem(same, 0, 5), same);
    assert.equal(moveItem(same, -1, 0), same);
  });
});
