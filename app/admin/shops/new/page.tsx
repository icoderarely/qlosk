import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShopEditor } from "@/components/admin/shop-editor/shop-editor";
import { requireRole } from "@/lib/require-role";
import { hasRole } from "@/services/admin-roles";
import { newShopData } from "@/services/shop-editor";
import { getShopTypes } from "@/services/settings";

export const metadata: Metadata = { title: "New shop" };

export default async function Page() {
  const user = await requireRole("viewer");
  // Viewers cannot create shops, so there is nothing for them here.
  if (!hasRole(user.role, "admin")) redirect("/admin/shops");
  const shopTypes = await getShopTypes();
  return <ShopEditor data={newShopData()} shopTypes={shopTypes} canEdit />;
}
