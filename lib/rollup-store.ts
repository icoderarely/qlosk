import type { PrismaClient } from "@/generated/prisma/client";
import type { DayRow, RollupStore } from "@/services/daily-stats";

export function createRollupStore(db: PrismaClient): RollupStore {
  return {
    async aggregate(from, to) {
      const at = { gte: from, lt: to };
      const [scans, taps, byLink] = await Promise.all([
        db.scanEvent.groupBy({ by: ["shopId", "isBot", "botReason"], where: { at, shopId: { not: null } }, _count: { _all: true } }),
        db.clickEvent.groupBy({ by: ["shopId", "isBot", "botReason"], where: { at }, _count: { _all: true } }),
        db.clickEvent.groupBy({ by: ["shopId", "linkId"], where: { at, isBot: false, linkId: { not: null } }, _count: { _all: true } }),
      ]);
      const rows = new Map<string, DayRow>();
      const row = (shopId: string) => {
        let r = rows.get(shopId);
        if (!r) {
          rows.set(shopId, (r = { shopId, scans: 0, taps: 0, botScans: 0, botTaps: 0, heldScans: 0, tapsByLink: {}, flagReasons: {} }));
        }
        return r;
      };
      const reason = (r: DayRow, why: string | null, n: number) => {
        const key = why ?? "unknown";
        r.flagReasons[key] = (r.flagReasons[key] ?? 0) + n;
      };
      for (const g of scans) {
        if (!g.shopId) continue;
        const r = row(g.shopId);
        const n = g._count._all;
        if (!g.isBot) r.scans += n;
        else {
          r.botScans += n;
          if (g.botReason === "spike_review") r.heldScans += n;
          reason(r, g.botReason, n);
        }
      }
      for (const g of taps) {
        const r = row(g.shopId);
        const n = g._count._all;
        if (!g.isBot) r.taps += n;
        else {
          r.botTaps += n;
          reason(r, g.botReason, n);
        }
      }
      for (const g of byLink) if (g.linkId) row(g.shopId).tapsByLink[g.linkId] = g._count._all;
      return [...rows.values()];
    },

    async replaceDay(day, rows) {
      const date = new Date(`${day}T00:00:00Z`); // a @db.Date column keeps just the date
      await db.$transaction([
        db.dailyStat.deleteMany({ where: { day: date } }),
        db.dailyStat.createMany({
          data: rows.map((r) => ({
            shopId: r.shopId,
            day: date,
            scans: r.scans,
            taps: r.taps,
            botScans: r.botScans,
            botTaps: r.botTaps,
            heldScans: r.heldScans,
            flagReasons: r.flagReasons,
            tapsByLink: r.tapsByLink,
          })),
        }),
      ]);
    },
  };
}
