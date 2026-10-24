import type { PrismaClient } from "@/generated/prisma/client";
import type { PrintFileLog } from "@/services/print-files";
import type { StandeeStore } from "@/services/standee";

export type ShopForPrint = { name: string; logoUrl: string | null; code: string };

/** The shop's name, logo and assigned code; null if it is missing or has no code. */
export async function shopForPrint(db: PrismaClient, id: string): Promise<ShopForPrint | null> {
  const shop = await db.shop.findUnique({
    where: { id },
    select: {
      name: true,
      logoUrl: true,
      qrCodes: { where: { status: "assigned" }, select: { code: true }, take: 1 },
    },
  });
  const code = shop?.qrCodes[0]?.code;
  return shop && code ? { name: shop.name, logoUrl: shop.logoUrl, code } : null;
}

/** One print_files row per generated download. */
export function createPrintFileLog(db: PrismaClient): PrintFileLog {
  return {
    async insert(row) {
      await db.printFile.create({ data: row });
    },
  };
}

export function createStandeeStore(db: PrismaClient): StandeeStore {
  return {
    async saveChoices(shopId, choices, userEmail) {
      const found = await db.shop.findUnique({ where: { id: shopId }, select: { id: true } });
      if (!found) return false;
      await db.$transaction([
        db.shop.update({
          where: { id: shopId },
          data: {
            standeeDesign: choices.design,
            standeeTheme: choices.theme,
            standeeHeadline: choices.headline,
            standeeSize: choices.size,
          },
        }),
        db.changeLog.create({ data: { shopId, userEmail, what: "Changed the standee design" } }),
      ]);
      return true;
    },
  };
}
