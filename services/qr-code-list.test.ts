import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_BATCH, generateCodes, parseCodeList } from "./qr.ts";

describe("parseCodeList", () => {
  it("normalises, drops repeats and keeps the order", () => {
    assert.deepEqual(parseCodeList("7kx2m9, abcdef,7KX2M9,,"), { ok: true, codes: ["7KX2M9", "ABCDEF"] });
  });
  it("refuses nothing, bad codes and too many", () => {
    assert.equal(parseCodeList(null).ok, false);
    assert.equal(parseCodeList("").ok, false);
    assert.deepEqual(parseCodeList("7KX2M9,OOOOOO"), { ok: false, error: "OOOOOO is not a valid code." });
    assert.equal(parseCodeList(generateCodes(MAX_BATCH + 1).join(",")).ok, false);
    assert.equal(parseCodeList(generateCodes(MAX_BATCH).join(",")).ok, true);
  });
});
