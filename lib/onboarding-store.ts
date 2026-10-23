import type { PrismaClient } from "@/generated/prisma/client";
import type { OnboardingStore } from "@/services/onboarding";

export function createOnboardingStore(db: PrismaClient): OnboardingStore {
  return {
    async board() {
      const shops = await db.shop.findMany({
        where: { status: { not: "archived" } },
        select: {
          id: true,
          name: true,
          shopType: true,
          stage: true,
          stageChangedAt: true,
          logoUrl: true,
          ownerName: true,
          ownerWhatsapp: true,
          plan: { select: { name: true } },
          pages: { where: { state: "published" }, select: { shopId: true } },
          qrCodes: { where: { status: "assigned" }, select: { code: true }, take: 1 },
          dailyStats: { select: { scans: true } },
        },
      });
      return shops.map((s) => ({
        id: s.id,
        name: s.name,
        shopType: s.shopType,
        stage: s.stage,
        stageChangedAt: s.stageChangedAt,
        hasPublished: s.pages.length > 0,
        hasLogo: Boolean(s.logoUrl),
        code: s.qrCodes[0]?.code ?? null,
        planName: s.plan?.name ?? null,
        ownerName: s.ownerName,
        ownerWhatsapp: s.ownerWhatsapp,
        scans: s.dailyStats.reduce((n, d) => n + d.scans, 0),
      }));
    },

    async stageOf(shopId) {
      const s = await db.shop.findUnique({ where: { id: shopId }, select: { name: true, stage: true } });
      return s ? { name: s.name, stage: s.stage } : null;
    },

    async setStage({ shopId, stage, what, userEmail }) {
      await db.$transaction([
        db.shop.update({ where: { id: shopId }, data: { stage, stageChangedAt: new Date() } }),
        db.changeLog.create({ data: { shopId, userEmail, what } }),
      ]);
    },
  };
}
