import type { PrismaClient } from "@/generated/prisma/client";
import type { BillingShop, BillingStore } from "@/services/billing";

const select = {
  id: true,
  name: true,
  status: true,
  planId: true,
  planStartedAt: true,
  planEndsAt: true,
  phone: true,
  ownerName: true,
  ownerWhatsapp: true,
  pages: { where: { state: "published" as const }, select: { shopId: true } },
};

type Row = {
  id: string;
  name: string;
  status: BillingShop["status"];
  planId: string | null;
  planStartedAt: Date | null;
  planEndsAt: Date | null;
  phone: string | null;
  ownerName: string | null;
  ownerWhatsapp: string | null;
  pages: { shopId: string }[];
};

const toShop = ({ pages, ...s }: Row): BillingShop => ({ ...s, hasPublished: pages.length > 0 });

export function createBillingStore(db: PrismaClient): BillingStore {
  return {
    async plans() {
      const plans = await db.plan.findMany({ orderBy: { months: "asc" } });
      return plans.map((p) => ({ id: p.id, name: p.name, months: p.months, pricePaise: p.pricePaise }));
    },

    async shops() {
      return (await db.shop.findMany({ where: { status: { not: "archived" } }, select })).map(toShop);
    },

    async find(shopId) {
      const row = await db.shop.findUnique({ where: { id: shopId }, select });
      return row ? toShop(row) : null;
    },

    async renew({ shopId, planStartedAt, planEndsAt, status, what, userEmail }) {
      await db.$transaction([
        db.shop.update({ where: { id: shopId }, data: { planStartedAt, planEndsAt, status } }),
        db.changeLog.create({ data: { shopId, userEmail, what } }),
      ]);
    },

    async setPrices({ prices, what, userEmail }) {
      await db.$transaction([
        ...prices.map((p) => db.plan.update({ where: { id: p.id }, data: { pricePaise: p.pricePaise } })),
        db.changeLog.create({ data: { userEmail, what } }),
      ]);
    },
  };
}
