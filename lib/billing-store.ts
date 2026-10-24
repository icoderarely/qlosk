import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { BillingShop, BillingStore, PlanSnapshot } from "@/services/billing";

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

type Stored = { planStartedAt: string | null; planEndsAt: string | null; status: PlanSnapshot["status"] };
type Payload = { kind: "renewal"; before: Stored; endsAfter: string };

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const date = (s: string | null) => (s ? new Date(s) : null);

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

    async renew({ shopId, planStartedAt, planEndsAt, status, what, userEmail, before }) {
      const undoPayload: Payload = {
        kind: "renewal",
        before: { planStartedAt: iso(before.planStartedAt), planEndsAt: iso(before.planEndsAt), status: before.status },
        endsAfter: planEndsAt.toISOString(),
      };
      await db.$transaction([
        db.shop.update({ where: { id: shopId }, data: { planStartedAt, planEndsAt, status } }),
        db.changeLog.create({ data: { shopId, userEmail, what, undoPayload } }),
      ]);
    },

    async setPlan({ shopId, planId, what, userEmail }) {
      await db.$transaction([
        db.shop.update({ where: { id: shopId }, data: { planId } }),
        db.changeLog.create({ data: { shopId, userEmail, what } }),
      ]);
    },

    async lastRenewal(shopId) {
      const row = await db.changeLog.findFirst({
        where: { shopId, undoPayload: { path: ["kind"], equals: "renewal" } },
        orderBy: { at: "desc" },
      });
      if (!row) return null;
      const p = row.undoPayload as Payload;
      return {
        logId: row.id,
        at: row.at,
        before: { planStartedAt: date(p.before.planStartedAt), planEndsAt: date(p.before.planEndsAt), status: p.before.status },
        endsAfter: new Date(p.endsAfter),
      };
    },

    async undoRenewal({ shopId, logId, restore, what, userEmail }) {
      await db.$transaction([
        db.shop.update({
          where: { id: shopId },
          data: { planStartedAt: restore.planStartedAt, planEndsAt: restore.planEndsAt, status: restore.status },
        }),
        // A spent undo is cleared, so the next Undo reaches the renewal before it.
        db.changeLog.update({ where: { id: logId }, data: { undoPayload: Prisma.DbNull } }),
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
