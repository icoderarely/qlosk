import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { niceMax } from "./chart-scale.ts";

describe("niceMax", () => {
  it("picks a round top that holds the biggest day", () => {
    assert.equal(niceMax(0), 4);
    assert.equal(niceMax(35), 40);
    assert.equal(niceMax(473), 800);
    assert.equal(niceMax(600), 800);
    assert.equal(niceMax(2000), 2000);
  });
});
