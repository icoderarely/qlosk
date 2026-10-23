import type { Metadata } from "next";
import { ShopsTable } from "@/components/admin/shops-table";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createShopsStore } from "@/lib/shops-store";
import { hasRole } from "@/services/admin-roles";
import { getShops, parseListQuery } from "@/services/shops";

export const metadata: Metadata = { title: "Shops" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("viewer");
  const query = parseListQuery(await searchParams);
  const list = await getShops(createShopsStore(getDb()), query);
  return <ShopsTable list={list} canEdit={hasRole(user.role, "admin")} />;
}
