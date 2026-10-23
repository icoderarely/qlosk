import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNewShopEditor, getShopEditor, getShops } from "./shops.ts";

// The admin pages read through these functions, and the mock data is replaced
// by database queries in a later slice. These tests pin the shape the pages
// rely on, so that swap cannot change it silently.
describe("shops service (mock data)", () => {
  it("lists shops with the tab counts from the design", async () => {
    const { shops, tabCounts } = await getShops();
    assert.equal(shops.length, 8);
    assert.equal(tabCounts.all, 48);
    assert.ok(shops.every((s) => s.id && s.name && s.slug));
  });

  it("returns an editor for a known shop and null for an unknown id", async () => {
    const velvet = await getShopEditor("1");
    assert.equal(velvet?.details.name, "Velvet Salon & Spa");
    assert.deepEqual(velvet?.look, { theme: "blush", layout: "list", font: "editorial" });
    assert.equal(await getShopEditor("nope"), null);
  });

  it("gives each caller its own copy, so editing one cannot change the next read", async () => {
    const a = await getShopEditor("1");
    a?.links.splice(0, 1);
    const b = await getShopEditor("1");
    assert.equal(b?.links.length, 7);
  });

  it("starts a new shop empty, with no id and no code", async () => {
    const fresh = await getNewShopEditor();
    assert.equal(fresh.id, null);
    assert.equal(fresh.code, null);
    assert.equal(fresh.details.name, "");
    assert.equal(fresh.changes.length, 0);
  });
});
