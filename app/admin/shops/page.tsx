import type { Metadata } from "next";
import { ShopsTable } from "@/components/admin/shops-table";
import { requireRole } from "@/lib/require-role";
import { getShops } from "@/services/shops";

export const metadata: Metadata = { title: "Shops" };

export default async function Page() {
  await requireRole("viewer");
  const { shops, tabCounts } = await getShops();
  return <ShopsTable shops={shops} tabCounts={tabCounts} />;
}
