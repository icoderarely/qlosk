import type { PrismaClient } from "@/generated/prisma/client";

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
