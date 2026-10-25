import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { EditorStore, StoredShop } from "@/services/shop-editor";
import { normalizeChoices } from "@/services/standee";

const SCAN_WINDOW_DAYS = 30;

/** One query for the shop and everything the page and editor need; by id or by slug. */
export async function loadShop(db: PrismaClient, where: { id: string } | { slug: string }): Promise<StoredShop | null> {
  const shop = await db.shop.findUnique({
    where,
    include: {
      plan: true,
      pages: true,
      links: { orderBy: { position: "asc" } },
      qrCodes: { where: { status: "assigned" }, take: 1 },
    },
  });
  if (!shop) return null;
  const draft = shop.pages.find((p) => p.state === "draft");
  const published = shop.pages.find((p) => p.state === "published");
  const stored: StoredShop = {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    shopType: shop.shopType,
    area: shop.area,
    city: shop.city,
    address: shop.address,
    phone: shop.phone,
    whatsapp: shop.whatsapp,
    waMessage: shop.waMessage,
    logoUrl: shop.logoUrl,
    coverUrl: shop.coverUrl,
    status: shop.status,
    ownerName: shop.ownerName,
    ownerWhatsapp: shop.ownerWhatsapp,
    notes: shop.notes,
    code: shop.qrCodes[0]?.code ?? null,
    planName: shop.plan?.name ?? null,
    planMonths: shop.plan?.months ?? null,
    planStartedAt: shop.planStartedAt,
    planEndsAt: shop.planEndsAt,
    draft: draft?.config ?? null,
    published: published?.config ?? null,
    publishedAt: published?.publishedAt ?? null,
    standee: normalizeChoices({
      design: shop.standeeDesign,
      theme: shop.standeeTheme,
      headline: shop.standeeHeadline,
      size: shop.standeeSize,
    }),
    linkRows: shop.links.map((l) => ({ id: l.id, type: l.type, label: l.label, target: l.target, enabled: l.enabled })),
  };
  return stored;
}

export function createEditorStore(db: PrismaClient): EditorStore {
  return {
    find: (id) => loadShop(db, { id }),

    async slugAvailable(slug, exceptShopId) {
      const [shop, old] = await Promise.all([
        db.shop.findFirst({
          where: { slug, ...(exceptShopId ? { NOT: { id: exceptShopId } } : {}) },
          select: { id: true },
        }),
        db.slugHistory.findFirst({
          where: { oldSlug: slug, ...(exceptShopId ? { NOT: { shopId: exceptShopId } } : {}) },
          select: { id: true },
        }),
      ]);
      return !shop && !old;
    },

    async changes(id, take) {
      const rows = await db.changeLog.findMany({
        where: { shopId: id },
        orderBy: { at: "desc" },
        take,
        select: { id: true, what: true, userEmail: true, at: true, undoPayload: true },
      });
      return rows;
    },

    async traffic(id) {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - SCAN_WINDOW_DAYS);
      const [sum, count, last] = await Promise.all([
        db.dailyStat.aggregate({
          where: { shopId: id, day: { gte: since } },
          _sum: { scans: true, taps: true, botScans: true, botTaps: true },
        }),
        db.dailyStat.count({ where: { shopId: id, day: { gte: since } } }),
        db.scanEvent.findFirst({
          where: { shopId: id, isBot: false },
          orderBy: { at: "desc" },
          select: { at: true },
        }),
      ]);
      const has = count > 0;
      return {
        scans: has ? (sum._sum.scans ?? 0) : null,
        taps: has ? (sum._sum.taps ?? 0) : null,
        bots: has ? (sum._sum.botScans ?? 0) + (sum._sum.botTaps ?? 0) : null,
        lastScan: last?.at ?? null,
      };
    },

    async create({ slug, columns, internal, config, userEmail }) {
      return db.$transaction(async (tx) => {
        const shop = await tx.shop.create({
          // Only the name and type go on the row now; the other public details
          // wait in the draft until the first publish.
          data: { slug, name: columns.name, shopType: columns.shopType, ...internal, status: "building" },
        });
        await tx.shopPage.create({
          data: { shopId: shop.id, state: "draft", config: config as Prisma.InputJsonObject },
        });
        await tx.changeLog.create({
          data: { shopId: shop.id, userEmail, what: "Shop created" },
        });
        return shop.id;
      });
    },

    async saveDraft({ id, slugChange, internal, config, userEmail, logs }) {
      await db.$transaction(async (tx) => {
        await tx.shop.update({
          where: { id },
          data: { ...internal, ...(slugChange ? { slug: slugChange.to } : {}) },
        });
        if (slugChange) {
          // Going back to an address this shop used before frees that old entry.
          await tx.slugHistory.deleteMany({ where: { shopId: id, oldSlug: slugChange.to } });
          await tx.slugHistory.create({ data: { shopId: id, oldSlug: slugChange.from } });
        }
        await tx.shopPage.upsert({
          where: { shopId_state: { shopId: id, state: "draft" } },
          create: { shopId: id, state: "draft", config: config as Prisma.InputJsonObject },
          update: { config: config as Prisma.InputJsonObject },
        });
        if (logs.length > 0) {
          await tx.changeLog.createMany({
            data: logs.map((l) => ({
              shopId: id,
              userEmail,
              what: l.what,
              ...(l.undo ? { undoPayload: l.undo as Prisma.InputJsonObject } : {}),
            })),
          });
        }
      });
    },

    async publish({ id, config, columns, links, userEmail }) {
      await db.$transaction(async (tx) => {
        await tx.shop.update({ where: { id }, data: columns });
        await tx.shopPage.upsert({
          where: { shopId_state: { shopId: id, state: "published" } },
          create: { shopId: id, state: "published", config: config as Prisma.InputJsonObject, publishedAt: new Date() },
          update: { config: config as Prisma.InputJsonObject, publishedAt: new Date() },
        });

        // Link rows follow the draft: same ids keep their click history, ids
        // that are gone are deleted (click_events.link_id is set to null).
        const keep = links.map((l) => l.id);
        // A button id that belongs to another shop must never be overwritten.
        const clash = await tx.link.findFirst({
          where: { id: { in: keep }, NOT: { shopId: id } },
          select: { id: true },
        });
        if (clash) throw new Error("Invalid button id.");
        await tx.link.deleteMany({ where: { shopId: id, id: { notIn: keep } } });
        for (const [position, l] of links.entries()) {
          const data = { type: l.type, label: l.label, target: l.target, position, enabled: l.enabled };
          await tx.link.upsert({
            where: { id: l.id },
            create: { id: l.id, shopId: id, ...data },
            update: data,
          });
        }
        await tx.changeLog.create({ data: { shopId: id, userEmail, what: "Published page" } });

        // Publishing makes a new shop live. Paused, archived and expired shops
        // keep their status; an admin changes those on purpose.
        const wentLive = await tx.shop.updateMany({
          where: { id, status: { in: ["building", "preview"] } },
          data: { status: "live" },
        });
        if (wentLive.count > 0) {
          await tx.changeLog.create({ data: { shopId: id, userEmail, what: "Shop is live" } });
        }
      });
    },
  };
}
