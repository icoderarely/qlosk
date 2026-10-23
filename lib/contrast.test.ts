import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio } from "./contrast.ts";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#FFFFFF")), 21);
    assert.equal(contrastRatio("#336699", "#336699"), 1);
  });

  it("does not depend on argument order", () => {
    assert.equal(
      contrastRatio("#0F6B5C", "#FFFFFF"),
      contrastRatio("#FFFFFF", "#0F6B5C"),
    );
  });

  it("matches the 6.4:1 the colour board states for the teal accent", () => {
    const r = contrastRatio("#0F6B5C", "#FFFFFF");
    assert.ok(r > 6.3 && r < 6.5, `got ${r}`);
  });

  it("rejects a colour that is not #RRGGBB", () => {
    assert.throws(() => contrastRatio("red", "#FFFFFF"));
  });
});
