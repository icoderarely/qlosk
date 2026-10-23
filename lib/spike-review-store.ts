import type { PrismaClient } from "@/generated/prisma/client";
import { dayKey } from "@/services/tracking";
import type { ReviewStore } from "@/services/spike-review";

export function createReviewStore(db: PrismaClient): ReviewStore {
  return {
    async resolve({ shopId, decision, what, userEmail }) {
      return db.$transaction(async (tx) => {
        const shop = await tx.shop.findUnique({ where: { id: shopId }, select: { name: true } });
        if (!shop) return null;
        const held = await tx.scanEvent.findMany({
          where: { shopId, isBot: true, botReason: "spike_review" },
          select: { id: true, at: true },
        });
        if (held.length > 0) {
          await tx.scanEvent.updateMany({
            where: { id: { in: held.map((e) => e.id) } },
            data: decision === "count" ? { isBot: false, botReason: null } : { botReason: "marked_bot" },
          });
          await tx.changeLog.create({ data: { shopId, userEmail, what: what(shop.name, held.length) } });
        }
        return { shopName: shop.name, scans: held.length, days: [...new Set(held.map((e) => dayKey(e.at)))] };
      });
    },
  };
}
