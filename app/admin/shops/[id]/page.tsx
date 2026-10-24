import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopEditor, TAB_IDS, type TabId } from "@/components/admin/shop-editor/shop-editor";
import type { StandeeQr } from "@/components/admin/shop-editor/standee-tab";
import { getDb } from "@/lib/db";
import { createBillingStore } from "@/lib/billing-store";
import { createQrStore } from "@/lib/qr-store";
import { requireRole } from "@/lib/require-role";
import { createEditorStore } from "@/lib/shop-editor-store";
import { hasRole } from "@/services/admin-roles";
import { getShopPlan } from "@/services/billing";
import { loadSettings, loadShopTypes } from "@/lib/load-settings";
import { qrBaseUrl } from "@/lib/print-assets";
import { buildQrArt, qrTarget } from "@/services/qr-art";
import { getShopEditor } from "@/services/shop-editor";
import { LAYOUT_IDS, THEME_IDS } from "@/components/shop-page/types";

export const metadata: Metadata = { title: "Edit shop" };

// The code the standee draws: the shop's own, or a sample until it has one. With no QR
// address set the standee cannot be drawn at all.
function standeeQrFor(code: string | null, savedBase: string | undefined): StandeeQr {
  try {
    const art = buildQrArt(qrTarget(qrBaseUrl(savedBase), code ?? "XXXXXX"));
    return { art, code, problem: null };
  } catch (error) {
    return { art: null, code, problem: error instanceof Error ? error.message : "The QR address is not set." };
  }
}

export default async function Page({ params, searchParams }: PageProps<"/admin/shops/[id]">) {
  const user = await requireRole("viewer");
  const { id } = await params;
  // A malformed id would make Postgres throw; treat it as not found.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const canEdit = hasRole(user.role, "admin");
  const qr = createQrStore(getDb());
  const [data, billing, shopTypes, settings, stock, shopsWithoutCode] = await Promise.all([
    getShopEditor(createEditorStore(getDb()), id),
    getShopPlan(createBillingStore(getDb()), id),
    loadShopTypes(),
    loadSettings(),
    canEdit ? qr.stock(100) : Promise.resolve([]),
    canEdit ? qr.shopsWithoutCode(500) : Promise.resolve([]),
  ]);
  if (!data) notFound();
  const tab = (await searchParams).tab;
  const initialTab = TAB_IDS.find((t): t is TabId => t === tab);
  // key: a new id starts the editor from that shop's data, not the last one's
  return (
    <ShopEditor
      key={id}
      data={data}
      shopTypes={shopTypes}
      canEdit={canEdit}
      qrChoices={{ stock, shops: shopsWithoutCode }}
      billing={billing}
      standeeQr={standeeQrFor(data.code, settings.domain.qrBase)}
      initialTab={initialTab}
      enabledThemes={THEME_IDS.filter((t) => settings.enabledThemes[t])}
      enabledLayouts={LAYOUT_IDS.filter((l) => settings.enabledLayouts[l])}
    />
  );
}
