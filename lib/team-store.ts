import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { TeamStore } from "@/services/team";

export function createTeamStore(db: PrismaClient): TeamStore {
  const member = (u: { id: string; username: string | null; name: string; adminRole: { role: "owner" | "admin" | "viewer" } | null }) =>
    u.adminRole ? { id: u.id, username: u.username ?? u.name, role: u.adminRole.role } : null;
  const withRole = { id: true, username: true, name: true, adminRole: { select: { role: true } } } as const;

  return {
    async list() {
      const users = await db.user.findMany({ where: { adminRole: { isNot: null } }, select: withRole });
      const order = { owner: 0, admin: 1, viewer: 2 };
      return users
        .flatMap((u) => member(u) ?? [])
        .sort((a, b) => order[a.role] - order[b.role] || a.username.localeCompare(b.username));
    },

    async find(userId) {
      const u = await db.user.findUnique({ where: { id: userId }, select: withRole });
      return u ? member(u) : null;
    },

    async usernameTaken(username) {
      return (await db.user.count({ where: { username } })) > 0;
    },

    async create({ username, passwordHash, role, userEmail }) {
      const id = randomUUID();
      await db.$transaction([
        db.user.create({
          data: { id, name: username, email: `${username}@admin.local`, emailVerified: true, username, displayUsername: username },
        }),
        db.account.create({
          data: { id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: passwordHash },
        }),
        db.adminRole.create({ data: { userId: id, role } }),
        db.changeLog.create({ data: { userEmail, what: `Team account added: ${username} (${role})` } }),
      ]);
      return id;
    },

    async setRole({ userId, role, username, from, userEmail }) {
      await db.$transaction([
        db.adminRole.update({ where: { userId }, data: { role } }),
        db.changeLog.create({ data: { userEmail, what: `Team role changed: ${username} from ${from} to ${role}` } }),
      ]);
    },

    async setPassword({ userId, passwordHash, username, userEmail }) {
      await db.$transaction([
        db.account.updateMany({ where: { userId, providerId: "credential" }, data: { password: passwordHash } }),
        db.session.deleteMany({ where: { userId } }),
        db.changeLog.create({ data: { userEmail, what: `Team password reset: ${username}` } }),
      ]);
    },

    async remove({ userId, username, userEmail }) {
      await db.$transaction([
        db.user.delete({ where: { id: userId } }),
        db.changeLog.create({ data: { userEmail, what: `Team account removed: ${username}` } }),
      ]);
    },
  };
}
