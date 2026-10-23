import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSignIn,
  getAdminByEmail,
  normalizeEmail,
  roleCanWrite,
  type AdminRecord,
  type AdminUserStore,
} from "./admin-users.ts";

function storeWith(...rows: AdminRecord[]): AdminUserStore {
  return {
    adminUser: {
      async findUnique({ where }) {
        return rows.find((r) => r.email === where.email) ?? null;
      },
    },
  };
}

const owner: AdminRecord = { email: "owner@example.com", role: "owner" };
const viewer: AdminRecord = { email: "view@example.com", role: "viewer" };

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeEmail("  Owner@Example.COM "), "owner@example.com");
  });
});

describe("getAdminByEmail", () => {
  it("finds an allowlisted email regardless of case", async () => {
    const found = await getAdminByEmail(storeWith(owner), "OWNER@example.com");
    assert.deepEqual(found, owner);
  });

  it("returns null for an email that is not on the list", async () => {
    assert.equal(await getAdminByEmail(storeWith(owner), "x@example.com"), null);
  });

  it("returns null for missing or blank input", async () => {
    const store = storeWith(owner);
    assert.equal(await getAdminByEmail(store, null), null);
    assert.equal(await getAdminByEmail(store, undefined), null);
    assert.equal(await getAdminByEmail(store, "   "), null);
  });
});

describe("canSignIn", () => {
  it("allows a verified allowlisted email", async () => {
    const ok = await canSignIn(storeWith(owner), {
      email: owner.email,
      email_verified: true,
    });
    assert.equal(ok, true);
  });

  it("blocks an allowlisted email Google has not verified", async () => {
    const ok = await canSignIn(storeWith(owner), {
      email: owner.email,
      email_verified: false,
    });
    assert.equal(ok, false);
    const missing = await canSignIn(storeWith(owner), { email: owner.email });
    assert.equal(missing, false);
  });

  it("blocks a verified email that is not on the list", async () => {
    const ok = await canSignIn(storeWith(owner), {
      email: "stranger@example.com",
      email_verified: true,
    });
    assert.equal(ok, false);
  });
});

describe("roleCanWrite", () => {
  it("lets owner and admin write, never viewer", () => {
    assert.equal(roleCanWrite("owner"), true);
    assert.equal(roleCanWrite("admin"), true);
    assert.equal(roleCanWrite(viewer.role), false);
  });
});
