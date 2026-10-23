import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  FONT_IDS,
  LAYOUT_IDS,
  THEME_IDS,
} from "@/components/shop-page/types";
import type {
  DbShopStatus,
  Look,
  LookChange,
  ShopFilter,
  ShopRecord,
  ShopsStore,
} from "@/services/shops";

const DEFAULT_LOOK: Look = { theme: "daylight", layout: "list", font: "clean" };
const SCAN_WINDOW_DAYS = 30;

function lookFromConfig(config: Prisma.JsonValue | undefined): Look | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const { theme, layout, font } = config as Record<string, unknown>;
  if (
    !(THEME_IDS as readonly unknown[]).includes(theme) ||
    !(LAYOUT_IDS as readonly unknown[]).includes(layout) ||
    !(FONT_IDS as readonly unknown[]).includes(font)
  ) {
    return null;
  }
  return { theme, layout, font } as Look;
}

function whereFrom(filter: ShopFilter): Prisma.ShopWhereInput {
  const and: Prisma.ShopWhereInput[] = [];
  if (filter.statuses) and.push({ status: { in: filter.statuses } });
  if (filter.shopType) and.push({ shopType: filter.shopType });
  if (filter.planName) and.push({ plan: { name: filter.planName } });
  if (filter.theme) {
    and.push({
      pages: { some: { state: "draft", config: { path: ["theme"], equals: filter.theme } } },
    });
  }
  if (filter.layout) {
    and.push({
      pages: { some: { state: "draft", config: { path: ["layout"], equals: filter.layout } } },
    });
  }
  if (filter.q) {
    and.push({
      OR: [
        { name: { contains: filter.q, mode: "insensitive" } },
        { slug: { contains: filter.q, mode: "insensitive" } },
        { phone: { contains: filter.q } },
        { qrCodes: { some: { code: { startsWith: filter.q.toUpperCase() } } } },
      ],
    });
  }
  return { AND: and };
}

export function createShopsStore(db: PrismaClient): ShopsStore {
  return {
    async list(filter, skip, take) {
      const where = whereFrom(filter);
      const [total, shops] = await Promise.all([
        db.shop.count({ where }),
        db.shop.findMany({
          where,
          skip,
          take,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          include: {
            plan: true,
            pages: { where: { state: "draft" } },
            qrCodes: { where: { status: "assigned" }, take: 1 },
          },
        }),
      ]);

      const since = new Date();
      since.setUTCDate(since.getUTCDate() - SCAN_WINDOW_DAYS);
      const stats = shops.length
        ? await db.dailyStat.groupBy({
            by: ["shopId"],
            where: { shopId: { in: shops.map((s) => s.id) }, day: { gte: since } },
            _sum: { scans: true },
          })
        : [];
      const scansByShop = new Map(stats.map((s) => [s.shopId, s._sum.scans ?? 0]));

      const rows: ShopRecord[] = shops.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        shopType: s.shopType,
        status: s.status,
        code: s.qrCodes[0]?.code ?? null,
        planName: s.plan?.name ?? null,
        planMonths: s.plan?.months ?? null,
        planStartedAt: s.planStartedAt,
        planEndsAt: s.planEndsAt,
        look: lookFromConfig(s.pages[0]?.config),
        scans: scansByShop.get(s.id) ?? null,
      }));
      return { rows, total };
    },

    async countByStatus() {
      const groups = await db.shop.groupBy({ by: ["status"], _count: { _all: true } });
      const out: Partial<Record<DbShopStatus, number>> = {};
      for (const g of groups) out[g.status] = g._count._all;
      return out;
    },

    async shopTypes() {
      const rows = await db.shop.findMany({
        where: { shopType: { not: null } },
        select: { shopType: true },
        distinct: ["shopType"],
        orderBy: { shopType: "asc" },
      });
      return rows.flatMap((r) => (r.shopType ? [r.shopType] : []));
    },

    async planNames() {
      const rows = await db.plan.findMany({ orderBy: { months: "asc" }, select: { name: true } });
      return rows.map((r) => r.name);
    },

    // Only theme, layout and font are touched; the rest of each page's config
    // (offer, wifi, banner, overrides) stays as it was. The published page gets
    // the same look so a live shop changes at once, but nothing else in a draft
    // is published by this.
    async applyLook({ ids, patch, userEmail, describe }) {
      return db.$transaction(async (tx) => {
        const shops = await tx.shop.findMany({
          where: { id: { in: ids } },
          include: { pages: true },
        });
        const changes: LookChange[] = [];
        for (const shop of shops) {
          const draft = shop.pages.find((p) => p.state === "draft");
          const before = lookFromConfig(draft?.config);
          const after: Look = { ...(before ?? DEFAULT_LOOK), ...patch };

          const draftConfig = {
            ...((draft?.config as Record<string, unknown> | undefined) ?? {}),
            ...after,
          } as Prisma.InputJsonObject;
          await tx.shopPage.upsert({
            where: { shopId_state: { shopId: shop.id, state: "draft" } },
            create: { shopId: shop.id, state: "draft", config: draftConfig },
            update: { config: draftConfig },
          });

          const published = shop.pages.find((p) => p.state === "published");
          if (published) {
            await tx.shopPage.update({
              where: { shopId_state: { shopId: shop.id, state: "published" } },
              data: {
                config: {
                  ...(published.config as Record<string, unknown>),
                  ...patch,
                } as Prisma.InputJsonObject,
              },
            });
          }

          const change: LookChange = { shopId: shop.id, name: shop.name, before, after };
          await tx.changeLog.create({
            data: {
              shopId: shop.id,
              userEmail,
              what: describe(change),
              undoPayload: { kind: "look", before } as Prisma.InputJsonObject,
            },
          });
          changes.push(change);
        }
        return changes;
      });
    },
  };
}
