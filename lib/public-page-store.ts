import type { PrismaClient } from "@/generated/prisma/client";
import { createEditorStore } from "./shop-editor-store";
import type { PublicStore } from "@/services/public-page";

export function createPublicStore(db: PrismaClient): PublicStore {
  const editor = createEditorStore(db);
  return {
    async findBySlug(slug) {
      const row = await db.shop.findUnique({ where: { slug }, select: { id: true } });
      return row ? editor.find(row.id) : null;
    },
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
