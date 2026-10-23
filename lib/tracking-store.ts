import type { PrismaClient } from "@/generated/prisma/client";
import type { TrackingStore } from "@/services/tracking";

export function createTrackingStore(db: PrismaClient): TrackingStore {
  return {
    async findCode(code) {
      const row = await db.qrCode.findUnique({
        where: { code },
        select: {
          status: true,
          shopId: true,
          shop: {
            select: {
              slug: true,
              status: true,
              pages: { where: { state: "published" }, select: { shopId: true } },
            },
          },
        },
      });
      if (!row) return null;
      const shop = row.shop;
      const live =
        row.status === "assigned" &&
        shop &&
        shop.status !== "paused" &&
        shop.status !== "archived" &&
        shop.pages.length > 0;
      return { status: row.status, shopId: row.shopId, liveSlug: live && shop ? shop.slug : null };
    },

    async recordScan({ code, shopId, ipHash, uaFamily }) {
      await db.scanEvent.create({ data: { code, shopId, ipHash, uaFamily, isBot: false } });
    },

    async findTapLink(code, linkId) {
      const qr = await db.qrCode.findUnique({ where: { code }, select: { status: true, shopId: true } });
      if (!qr || qr.status !== "assigned" || !qr.shopId) return null;
      const link = await db.link.findFirst({
        where: { id: linkId, shopId: qr.shopId },
        select: { id: true, shopId: true, type: true, target: true, enabled: true },
      });
      return link ? { shopId: link.shopId, linkId: link.id, type: link.type, target: link.target, enabled: link.enabled } : null;
    },

    async recordTap({ shopId, linkId, ipHash }) {
      await db.clickEvent.create({ data: { shopId, linkId, ipHash, isBot: false } });
    },
  };
}
