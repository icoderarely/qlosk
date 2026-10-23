import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_FILTERS, type FilterSettings, type TrackingStore } from "@/services/tracking";

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

    async recordScan({ code, shopId, ipHash, uaFamily, isBot, botReason }) {
      await db.scanEvent.create({ data: { code, shopId, ipHash, uaFamily, isBot, botReason } });
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

    async recordTap({ shopId, linkId, ipHash, isBot, botReason }) {
      await db.clickEvent.create({ data: { shopId, linkId, ipHash, isBot, botReason } });
    },

    async filterSettings() {
      const row = await db.setting.findUnique({ where: { key: "filtering" } });
      const value = row?.value;
      if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_FILTERS;
      const saved = value as Record<string, unknown>;
      const out = { ...DEFAULT_FILTERS };
      for (const k of Object.keys(out) as (keyof FilterSettings)[]) {
        if (typeof saved[k] === "boolean") out[k] = saved[k];
      }
      return out;
    },

    async countRecent(ipHash, since) {
      const [scans, taps] = await Promise.all([
        db.scanEvent.count({ where: { ipHash, at: { gte: since } } }),
        db.clickEvent.count({ where: { ipHash, at: { gte: since } } }),
      ]);
      return scans + taps;
    },

    async hasCountedRecent(kind, ipHash, target, since) {
      if (kind === "scan") {
        return (await db.scanEvent.count({ where: { ipHash, code: target, isBot: false, at: { gte: since } }, take: 1 })) > 0;
      }
      return (await db.clickEvent.count({ where: { ipHash, linkId: target, isBot: false, at: { gte: since } }, take: 1 })) > 0;
    },

    async spikeStats(shopId, now) {
      const hourAgo = new Date(now.getTime() - 3600_000);
      const weekAgo = new Date(hourAgo.getTime() - 7 * 24 * 3600_000);
      const [lastHour, weekBefore] = await Promise.all([
        db.scanEvent.count({
          where: { shopId, at: { gte: hourAgo }, OR: [{ isBot: false }, { botReason: "spike_review" }] },
        }),
        db.scanEvent.count({ where: { shopId, isBot: false, at: { gte: weekAgo, lt: hourAgo } } }),
      ]);
      return { lastHour, weekBefore };
    },

    async holdScans(shopId, since) {
      await db.scanEvent.updateMany({
        where: { shopId, isBot: false, at: { gte: since } },
        data: { isBot: true, botReason: "spike_review" },
      });
    },
  };
}
