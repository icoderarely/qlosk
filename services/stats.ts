// Overview and Reports reads for the admin. Fake data for now (see
// services/shops.ts).
import { OVERVIEW, REPORTS, type MockOverview, type MockReports } from "../lib/mock/stats.ts";
import { SHOPS, type MockShop } from "../lib/mock/shops.ts";

export type RecentShop = Pick<MockShop, "id" | "name" | "code" | "plan" | "scans" | "status">;

export type OverviewData = Omit<MockOverview, "recentShopIds"> & {
  recentShops: RecentShop[];
};

export async function getOverview(): Promise<OverviewData> {
  const { recentShopIds, ...rest } = OVERVIEW;
  const recentShops = recentShopIds.flatMap((id) => {
    const s = SHOPS.find((shop) => shop.id === id);
    return s
      ? [{ id: s.id, name: s.name, code: s.code, plan: s.plan, scans: s.scans, status: s.status }]
      : [];
  });
  return { ...rest, recentShops };
}

export type ReportsData = MockReports;

export async function getReports(): Promise<ReportsData> {
  return REPORTS;
}
