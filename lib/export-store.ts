import type { PrismaClient } from "@/generated/prisma/client";

// Everything we hold about the shops, for the owner to keep. No scan or tap
// events (they are large and already summarised in daily_stats) and nothing
// about admin accounts.
export async function exportAllShops(db: PrismaClient) {
  const shops = await db.shop.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      plan: { select: { name: true, months: true } },
      pages: true,
      links: { orderBy: { position: "asc" } },
      qrCodes: { select: { code: true, status: true } },
      slugHistory: { select: { oldSlug: true } },
      dailyStats: { orderBy: { day: "asc" } },
    },
  });
  return { exportedAt: new Date().toISOString(), shops };
}
