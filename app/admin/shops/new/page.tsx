import type { Metadata } from "next";
import { ShopEditor } from "@/components/admin/shop-editor/shop-editor";
import { requireRole } from "@/lib/require-role";
import { getShopTypes } from "@/services/settings";
import { getNewShopEditor } from "@/services/shops";

export const metadata: Metadata = { title: "New shop" };

export default async function Page() {
  await requireRole("viewer");
  const [data, shopTypes] = await Promise.all([getNewShopEditor(), getShopTypes()]);
  return <ShopEditor data={data} shopTypes={shopTypes} />;
}
