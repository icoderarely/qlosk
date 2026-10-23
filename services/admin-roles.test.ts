import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRole, hasRole, type Role, type RoleStore } from "./admin-roles.ts";

function storeWith(rows: Record<string, Role>): RoleStore {
  return {
    adminRole: {
      async findUnique({ where }) {
        const role = rows[where.userId];
        return role ? { role } : null;
      },
    },
  };
}

describe("getRole", () => {
  it("returns the stored role", async () => {
    assert.equal(await getRole(storeWith({ u1: "owner" }), "u1"), "owner");
  });

  it("returns null for an account with no admin_roles row", async () => {
    assert.equal(await getRole(storeWith({ u1: "owner" }), "u2"), null);
  });
});

describe("hasRole", () => {
  it("lets a role meet its own level and anything below", () => {
    assert.equal(hasRole("owner", "owner"), true);
    assert.equal(hasRole("owner", "admin"), true);
    assert.equal(hasRole("admin", "admin"), true);
    assert.equal(hasRole("admin", "viewer"), true);
    assert.equal(hasRole("viewer", "viewer"), true);
  });

  it("keeps viewers out of anything that writes", () => {
    assert.equal(hasRole("viewer", "admin"), false);
    assert.equal(hasRole("viewer", "owner"), false);
    assert.equal(hasRole("admin", "owner"), false);
  });

  it("never admits an account without a role", () => {
    assert.equal(hasRole(null, "viewer"), false);
  });
});
