import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Role } from "./admin-roles.ts";
import { getRole, hasRole } from "./admin-roles.ts";
import { addMember, changeRole, removeMember, resetPassword, type TeamMember, type TeamRole, type TeamStore } from "./team.ts";

const hash = async (pw: string) => `hash(${pw})`;

function fake(initial: TeamMember[]) {
  const members = new Map(initial.map((m) => [m.id, m]));
  const passwords = new Map<string, string>();
  const sessions = new Set<string>(initial.map((m) => m.id));
  const log: string[] = [];
  let next = 1;
  const store: TeamStore = {
    async list() {
      return [...members.values()];
    },
    async find(id) {
      return members.get(id) ?? null;
    },
    async usernameTaken(username) {
      return [...members.values()].some((m) => m.username === username);
    },
    async create({ username, passwordHash, role }: { username: string; passwordHash: string; role: TeamRole }) {
      const id = `u${next++}`;
      members.set(id, { id, username, role });
      passwords.set(id, passwordHash);
      sessions.add(id);
      return id;
    },
    async setRole({ userId, role }) {
      const m = members.get(userId);
      if (m) members.set(userId, { ...m, role });
    },
    async setPassword({ userId, passwordHash }) {
      passwords.set(userId, passwordHash);
      sessions.delete(userId);
    },
    async remove({ userId, username }) {
      members.delete(userId);
      sessions.delete(userId);
      log.push(`removed ${username}`);
    },
  };
  // The same lookup requireRole uses on every request.
  const roleStore = {
    adminRole: {
      async findUnique({ where }: { where: { userId: string } }): Promise<{ role: Role } | null> {
        const m = members.get(where.userId);
        return m ? { role: m.role } : null;
      },
    },
  };
  return { store, members, passwords, sessions, log, roleStore };
}

const OWNER: TeamMember = { id: "o1", username: "boss", role: "owner" };
const HELPER: TeamMember = { id: "h1", username: "helper", role: "viewer" };

describe("addMember", () => {
  it("makes an account with a hashed password and the chosen role", async () => {
    const f = fake([OWNER]);
    const result = await addMember(f.store, hash, { username: " Priya ", password: "a-long-temporary-pw", role: "admin" }, "boss");
    assert.equal(result.ok, true);
    const made = [...f.members.values()].find((m) => m.username === "priya");
    assert.equal(made?.role, "admin");
    assert.equal(f.passwords.get(made?.id ?? ""), "hash(a-long-temporary-pw)");
  });

  it("never makes an owner, and refuses a weak password or a taken name", async () => {
    const f = fake([OWNER]);
    assert.equal((await addMember(f.store, hash, { username: "x1x", password: "a-long-temporary-pw", role: "owner" }, "boss")).ok, false);
    assert.equal((await addMember(f.store, hash, { username: "priya", password: "short", role: "viewer" }, "boss")).ok, false);
    assert.equal((await addMember(f.store, hash, { username: "bad name!", password: "a-long-temporary-pw", role: "viewer" }, "boss")).ok, false);
    assert.equal((await addMember(f.store, hash, { username: "BOSS", password: "a-long-temporary-pw", role: "viewer" }, "boss")).ok, false);
    assert.equal(f.members.size, 1);
  });
});

describe("changeRole", () => {
  it("moves a team account between admin and viewer", async () => {
    const f = fake([OWNER, HELPER]);
    assert.equal((await changeRole(f.store, "h1", "admin", "boss")).ok, true);
    assert.equal(f.members.get("h1")?.role, "admin");
  });
  it("leaves the owner alone and refuses a role that does not exist", async () => {
    const f = fake([OWNER, HELPER]);
    assert.equal((await changeRole(f.store, "o1", "viewer", "boss")).ok, false);
    assert.equal((await changeRole(f.store, "h1", "owner", "boss")).ok, false);
    assert.equal((await changeRole(f.store, "h1", "viewer", "boss")).ok, false);
    assert.equal((await changeRole(f.store, "nope", "admin", "boss")).ok, false);
    assert.equal(f.members.get("o1")?.role, "owner");
  });
});

describe("resetPassword", () => {
  it("sets a new hash and signs the account out", async () => {
    const f = fake([OWNER, HELPER]);
    assert.equal((await resetPassword(f.store, hash, "h1", "another-long-password", "boss")).ok, true);
    assert.equal(f.passwords.get("h1"), "hash(another-long-password)");
    assert.equal(f.sessions.has("h1"), false);
  });
  it("refuses a short password and a missing account", async () => {
    const f = fake([OWNER, HELPER]);
    assert.equal((await resetPassword(f.store, hash, "h1", "short", "boss")).ok, false);
    assert.equal((await resetPassword(f.store, hash, "zzz", "another-long-password", "boss")).ok, false);
    assert.equal(f.sessions.has("h1"), true);
  });
});

describe("removeMember", () => {
  it("blocks the account on its next request", async () => {
    const f = fake([OWNER, HELPER]);
    // Before: the role lookup lets the helper in.
    assert.equal(hasRole(await getRole(f.roleStore, "h1"), "viewer"), true);
    assert.deepEqual(await removeMember(f.store, "h1", "boss"), { ok: true, message: "helper was removed and can no longer sign in." });
    // After: no role, so requireRole would send them to the login page.
    assert.equal(await getRole(f.roleStore, "h1"), null);
    assert.equal(hasRole(await getRole(f.roleStore, "h1"), "viewer"), false);
    assert.equal(f.sessions.has("h1"), false);
  });
  it("never removes the owner", async () => {
    const f = fake([OWNER, HELPER]);
    assert.deepEqual(await removeMember(f.store, "o1", "boss"), { ok: false, error: "The owner account cannot be removed." });
    assert.equal(f.members.has("o1"), true);
    assert.deepEqual(f.log, []);
  });
  it("says so when the account is already gone", async () => {
    const f = fake([OWNER]);
    assert.equal((await removeMember(f.store, "h1", "boss")).ok, false);
  });
});
