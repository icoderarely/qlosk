import type { PrismaClient } from "@/generated/prisma/client";
import type { LinkType } from "@/components/shop-page/types";
import type { StatDay, StatsStore } from "@/services/stats";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);

function numbers(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) if (typeof v === "number") out[k] = v;
  return out;
}

// Reads daily_stats and the small tables around it. Never touches raw events.
export function createStatsStore(db: PrismaClient): StatsStore {
  return {
    async days(from, to) {
      const rows = await db.dailyStat.findMany({ where: { day: { gte: day(from), lte: day(to) } } });
      return rows.map(
        (r): StatDay => ({
          shopId: r.shopId,
          day: isoDay(r.day),
          scans: r.scans,
          taps: r.taps,
          botScans: r.botScans,
          botTaps: r.botTaps,
          heldScans: r.heldScans,
          flagReasons: numbers(r.flagReasons),
          tapsByLink: numbers(r.tapsByLink),
        }),
      );
    },

    async shops() {
      const rows = await db.shop.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          stage: true,
          stageChangedAt: true,
          createdAt: true,
          planEndsAt: true,
          ownerName: true,
          ownerWhatsapp: true,
          plan: { select: { name: true } },
          qrCodes: { where: { status: "assigned" }, select: { code: true }, take: 1 },
        },
      });
      return rows.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        stage: s.stage,
        stageChangedAt: s.stageChangedAt,
        createdAt: s.createdAt,
        code: s.qrCodes[0]?.code ?? null,
        planName: s.plan?.name ?? null,
        planEndsAt: s.planEndsAt,
        ownerName: s.ownerName,
        ownerWhatsapp: s.ownerWhatsapp,
      }));
    },

    async linkTypes() {
      const links = await db.link.findMany({ select: { id: true, type: true } });
      return Object.fromEntries(links.map((l) => [l.id, l.type as LinkType]));
    },

    async held() {
      const grouped = await db.dailyStat.groupBy({
        by: ["shopId"],
        where: { heldScans: { gt: 0 } },
        _sum: { heldScans: true },
        _min: { day: true },
        _max: { day: true },
      });
      return grouped.flatMap((g) =>
        g._min.day && g._max.day
          ? [{ shopId: g.shopId, scans: g._sum.heldScans ?? 0, firstDay: isoDay(g._min.day), lastDay: isoDay(g._max.day) }]
          : [],
      );
    },
  };
}
