import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopEditor } from "@/components/admin/shop-editor/shop-editor";
import { getDb } from "@/lib/db";
import { createQrStore } from "@/lib/qr-store";
import { requireRole } from "@/lib/require-role";
import { createEditorStore } from "@/lib/shop-editor-store";
import { hasRole } from "@/services/admin-roles";
import { getShopEditor } from "@/services/shop-editor";
import { loadSettings, loadShopTypes } from "@/lib/load-settings";
import { LAYOUT_IDS, THEME_IDS } from "@/components/shop-page/types";

export const metadata: Metadata = { title: "Edit shop" };

export default async function Page({ params }: PageProps<"/admin/shops/[id]">) {
  const user = await requireRole("viewer");
  const { id } = await params;
  // A malformed id would make Postgres throw; treat it as not found.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const canEdit = hasRole(user.role, "admin");
  const qr = createQrStore(getDb());
  const [data, shopTypes, settings, stock, shopsWithoutCode] = await Promise.all([
    getShopEditor(createEditorStore(getDb()), id),
    loadShopTypes(),
    loadSettings(),
    canEdit ? qr.stock(100) : Promise.resolve([]),
    canEdit ? qr.shopsWithoutCode(500) : Promise.resolve([]),
  ]);
  if (!data) notFound();
  // key: a new id starts the editor from that shop's data, not the last one's
  return (
    <ShopEditor
      key={id}
      data={data}
      shopTypes={shopTypes}
      canEdit={canEdit}
      qrChoices={{ stock, shops: shopsWithoutCode }}
      enabledThemes={THEME_IDS.filter((t) => settings.enabledThemes[t])}
      enabledLayouts={LAYOUT_IDS.filter((l) => settings.enabledLayouts[l])}
    />
  );
}
