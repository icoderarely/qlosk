import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopEditor } from "@/components/admin/shop-editor/shop-editor";
import { requireRole } from "@/lib/require-role";
import { getShopTypes } from "@/services/settings";
import { getShopEditor } from "@/services/shops";

export const metadata: Metadata = { title: "Edit shop" };

export default async function Page({ params }: PageProps<"/admin/shops/[id]">) {
  await requireRole("viewer");
  const { id } = await params;
  const [data, shopTypes] = await Promise.all([getShopEditor(id), getShopTypes()]);
  if (!data) notFound();
  // key: a new id starts the editor from that shop's data, not the last one's
  return <ShopEditor key={id} data={data} shopTypes={shopTypes} />;
}
