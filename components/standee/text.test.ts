import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faceForText } from "./faces.ts";
import { fit, measure, normalHeight, wrap } from "./text.ts";

describe("standee text", () => {
  it("measures wider text wider, and adds letter spacing", () => {
    assert.ok(measure("dmsans700", 14, "Hello world") > measure("dmsans700", 14, "Hello"));
    assert.ok(measure("manrope800", 15, "SCAN", 3) > measure("manrope800", 15, "SCAN"));
    assert.ok(measure("fraunces700", 20, "W") > measure("fraunces700", 20, "i"));
  });
  it("breaks lines at spaces and never past the width", () => {
    const lines = wrap("fraunces700", 40, "Your shortcut to everything here", 432);
    assert.equal(lines.join(" "), "Your shortcut to everything here");
    assert.ok(lines.length >= 2);
    for (const l of lines) assert.ok(measure("fraunces700", 40, l) <= 432, l);
  });
  it("fit takes the first plan that works, biggest size first", () => {
    const one = fit("fraunces700", "Velvet Salon & Spa", 400, [{ lines: 1, max: 30, min: 22 }]);
    assert.equal(one.size, 30);
    assert.equal(one.truncated, false);
    const shrunk = fit("fraunces700", "Velvet Salon & Spa and Beauty Studio", 400, [{ lines: 1, max: 30, min: 22 }, { lines: 2, max: 26, min: 20 }]);
    assert.ok(shrunk.lines.length <= 2);
    for (const l of shrunk.lines) assert.ok(measure("fraunces700", shrunk.size, l) <= 400);
  });
  it("fit shortens text that cannot fit, instead of running off the page", () => {
    const out = fit("dmsans700", "A".repeat(200), 120, [{ lines: 2, max: 14.5, min: 12 }]);
    assert.equal(out.truncated, true);
    assert.ok(out.lines.length <= 2);
    for (const l of out.lines) assert.ok(measure("dmsans700", out.size, l) <= 120, l);
    assert.ok(out.lines.at(-1)!.endsWith("…"));
  });
  it("shows Hindi and Marathi in the Devanagari font", () => {
    assert.equal(faceForText("dmsans700", "Velvet"), "dmsans700");
    assert.equal(faceForText("dmsans700", "कावेरी"), "indic700");
    assert.equal(faceForText("dmsans400", "कावेरी"), "indic400");
    assert.equal(faceForText("dmsans700", "Kaveri – ₹99"), "dmsans700");
  });
  it("a line box is as tall as the font's ascent plus descent", () => {
    assert.ok(Math.abs(normalHeight("dmsans400", 100) - 130.2) < 0.01);
  });
});
