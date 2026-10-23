import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkNewCredentials, normalizeUsername } from "./admin-accounts.ts";

describe("normalizeUsername", () => {
  it("trims and lowercases, as Better Auth does", () => {
    assert.equal(normalizeUsername("  Owner.One "), "owner.one");
  });
});

describe("checkNewCredentials", () => {
  const good = "a-long-enough-password";

  it("accepts a normal username and a long password", () => {
    assert.deepEqual(checkNewCredentials("Owner", good), []);
  });

  it("rejects a short or long username", () => {
    assert.equal(checkNewCredentials("ab", good).length, 1);
    assert.equal(checkNewCredentials("x".repeat(31), good).length, 1);
  });

  it("rejects characters Better Auth would refuse", () => {
    assert.equal(checkNewCredentials("bad name", good).length, 1);
    assert.equal(checkNewCredentials("bad@name", good).length, 1);
  });

  it("rejects a short password", () => {
    assert.equal(checkNewCredentials("owner", "short").length, 1);
  });

  it("rejects a password over 128 characters", () => {
    assert.equal(checkNewCredentials("owner", "x".repeat(129)).length, 1);
  });
});
