import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ShopActionsStore } from "@/services/shop-actions";

export function createShopActionsStore(db: PrismaClient): ShopActionsStore {
  return {
    async status(shopId) {
      const shop = await db.shop.findUnique({
        where: { id: shopId },
        select: { status: true, pages: { where: { state: "published" }, select: { shopId: true } } },
      });
      return shop ? { status: shop.status, hasPublished: shop.pages.length > 0 } : null;
    },

    async setStatus({ shopId, status, what, undo, userEmail }) {
      await db.$transaction([
        db.shop.update({ where: { id: shopId }, data: { status } }),
        db.changeLog.create({
          data: { shopId, userEmail, what, undoPayload: undo as Prisma.InputJsonObject },
        }),
      ]);
    },

    async changes(shopId, take) {
      return db.changeLog.findMany({
        where: { shopId },
        orderBy: { at: "desc" },
        take,
        select: { id: true, what: true, userEmail: true, at: true, undoPayload: true },
      });
    },

    async change(shopId, changeId) {
      return db.changeLog.findFirst({
        where: { id: changeId, shopId },
        select: { id: true, what: true, userEmail: true, at: true, undoPayload: true },
      });
    },

    async applyUndo({ shopId, changeId, action, what, userEmail }) {
      await db.$transaction(async (tx) => {
        if (action.type === "status") {
          await tx.shop.update({ where: { id: shopId }, data: { status: action.status } });
        } else if (action.type === "look") {
          for (const state of ["draft", "published"] as const) {
            const page = await tx.shopPage.findUnique({ where: { shopId_state: { shopId, state } } });
            if (!page) continue;
            await tx.shopPage.update({
              where: { shopId_state: { shopId, state } },
              data: { config: { ...(page.config as Record<string, unknown>), ...action.look } as Prisma.InputJsonObject },
            });
          }
        } else {
          await tx.shopPage.upsert({
            where: { shopId_state: { shopId, state: "draft" } },
            create: { shopId, state: "draft", config: action.config as Prisma.InputJsonObject },
            update: { config: action.config as Prisma.InputJsonObject },
          });
        }
        await tx.changeLog.update({ where: { id: changeId }, data: { undoPayload: Prisma.DbNull } });
        await tx.changeLog.create({ data: { shopId, userEmail, what } });
      });
    },

    async finishUndo({ shopId, changeId, what, userEmail }) {
      await db.$transaction([
        db.changeLog.update({ where: { id: changeId }, data: { undoPayload: Prisma.DbNull } }),
        db.changeLog.create({ data: { shopId, userEmail, what } }),
      ]);
    },
  };
}
