import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShopEditor } from "@/components/admin/shop-editor/shop-editor";
import { requireRole } from "@/lib/require-role";
import { hasRole } from "@/services/admin-roles";
import { newShopData } from "@/services/shop-editor";
import { getSettings, getShopTypes } from "@/services/settings";
import { LAYOUT_IDS, THEME_IDS } from "@/components/shop-page/types";

export const metadata: Metadata = { title: "New shop" };

export default async function Page() {
  const user = await requireRole("viewer");
  // Viewers cannot create shops, so there is nothing for them here.
  if (!hasRole(user.role, "admin")) redirect("/admin/shops");
  const [shopTypes, settings] = await Promise.all([getShopTypes(), getSettings()]);
  return (
    <ShopEditor
      data={newShopData()}
      shopTypes={shopTypes}
      canEdit
      qrChoices={{ stock: [], shops: [] }}
      enabledThemes={THEME_IDS.filter((t) => settings.enabledThemes[t])}
      enabledLayouts={LAYOUT_IDS.filter((l) => settings.enabledLayouts[l])}
    />
  );
}
