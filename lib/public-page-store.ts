import type { PrismaClient } from "@/generated/prisma/client";
import { loadShop } from "./shop-editor-store";
import type { PublicStore } from "@/services/public-page";

export function createPublicStore(db: PrismaClient): PublicStore {
  return {
    // One query: the slug is unique, so there is no need to look up the id first.
    findBySlug: (slug) => loadShop(db, { slug }),
    async isLive(slug) {
      const row = await db.shop.findFirst({
        where: {
          slug,
          status: { notIn: ["paused", "archived"] },
          pages: { some: { state: "published" } },
        },
        select: { id: true },
      });
      return row !== null;
    },
    async currentSlugForOld(oldSlug) {
      const row = await db.slugHistory.findUnique({
        where: { oldSlug },
        select: { shop: { select: { slug: true } } },
      });
      return row?.shop.slug ?? null;
    },
  };
}
