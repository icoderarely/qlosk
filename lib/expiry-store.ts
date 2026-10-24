import type { PrismaClient } from "@/generated/prisma/client";
import type { ExpiryStore } from "@/services/plans";

export function createExpiryStore(db: PrismaClient): ExpiryStore {
  return {
    async candidates() {
      return db.shop.findMany({
        where: { status: { in: ["live", "quiet"] }, planEndsAt: { not: null } },
        select: { id: true, name: true, status: true, planEndsAt: true },
      });
    },

    async markExpired(shops) {
      await db.$transaction([
        ...shops.map((s) => db.shop.update({ where: { id: s.id }, data: { status: "expired" } })),
        db.changeLog.createMany({
          data: shops.map((s) => ({
            shopId: s.id,
            userEmail: "system",
            what: "Plan ended more than 15 days ago. The page now shows only the shop name, Call and Directions.",
          })),
        }),
      ]);
    },
  };
}
