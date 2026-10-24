import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShopEditor } from "@/components/admin/shop-editor/shop-editor";
import { requireRole } from "@/lib/require-role";
import { hasRole } from "@/services/admin-roles";
import { newShopData } from "@/services/shop-editor";
import { loadSettings, loadShopTypes } from "@/lib/load-settings";
import { LAYOUT_IDS, THEME_IDS } from "@/components/shop-page/types";
import { Suspense } from "react";

export const metadata: Metadata = { title: "New shop" };

// The session is request-time data, so the page body sits behind its own Suspense
// boundary: a navigation into this page can show the fallback instead of blocking.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[50dvh]" role="status" aria-label="Loading" />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireRole("viewer");
  // Viewers cannot create shops, so there is nothing for them here.
  if (!hasRole(user.role, "admin")) redirect("/admin/shops");
  const [shopTypes, settings] = await Promise.all([loadShopTypes(), loadSettings()]);
  return (
    <ShopEditor
      billing={null}
      data={newShopData()}
      shopTypes={shopTypes}
      canEdit
      qrChoices={{ stock: [], shops: [] }}
      standeeQr={{ art: null, svg: null, code: null, problem: null }}
      enabledThemes={THEME_IDS.filter((t) => settings.enabledThemes[t])}
      enabledLayouts={LAYOUT_IDS.filter((l) => settings.enabledLayouts[l])}
    />
  );
}
