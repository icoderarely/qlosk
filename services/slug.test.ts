import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkSlug, freeSlug, slugify } from "./slug.ts";

describe("slugify", () => {
  it("makes a clean address from a shop name", () => {
    assert.equal(slugify("Velvet Salon & Spa"), "velvet-salon-and-spa");
    assert.equal(slugify("  Dr. Mehta's Dental!! "), "dr-mehtas-dental");
    assert.equal(slugify("Café Bûn"), "cafe-bun");
  });

  it("never returns an empty or too-short address", () => {
    assert.equal(slugify("!!!"), "shop");
    assert.equal(slugify("ab"), "ab-shop");
    assert.equal(slugify("दुकान"), "shop");
  });

  it("stays within the length limit without a trailing hyphen", () => {
    const slug = slugify("a ".repeat(60));
    assert.ok(slug.length <= 50);
    assert.ok(!slug.endsWith("-"));
  });
});

describe("checkSlug", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    assert.equal(checkSlug("velvet-salon"), null);
    assert.equal(checkSlug("shop24"), null);
  });

  it("rejects bad shapes and reserved words", () => {
    for (const bad of ["ab", "Velvet", "velvet salon", "-velvet", "velvet-", "vel--vet", "vel_vet", "admin", "api", "playground"]) {
      assert.notEqual(checkSlug(bad), null, bad);
    }
  });
});

describe("freeSlug (unique addresses)", () => {
  it("returns the base when it is free", async () => {
    assert.equal(await freeSlug("velvet-salon", async () => false), "velvet-salon");
  });

  it("adds a number until it finds a free one", async () => {
    const taken = new Set(["velvet-salon", "velvet-salon-2"]);
    assert.equal(await freeSlug("velvet-salon", async (s) => taken.has(s)), "velvet-salon-3");
  });
});
