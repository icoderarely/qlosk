import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopsTable } from "@/components/admin/shops-table";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createShopsStore } from "@/lib/shops-store";
import { hasRole } from "@/services/admin-roles";
import { getShops, parseListQuery } from "@/services/shops";

export const metadata: Metadata = { title: "Shops" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The session and search params are request-time data, so the page body sits
// behind its own Suspense boundary: a navigation into /admin/shops from another
// admin page can then show the fallback instead of blocking.
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="min-h-[50dvh]" role="status" aria-label="Loading shops" />}>
      <ShopsList searchParams={searchParams} />
    </Suspense>
  );
}

async function ShopsList({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("viewer");
  const query = parseListQuery(await searchParams);
  const list = await getShops(createShopsStore(getDb()), query);
  return <ShopsTable list={list} canEdit={hasRole(user.role, "admin")} />;
}
