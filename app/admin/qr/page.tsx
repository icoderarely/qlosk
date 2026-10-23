import type { Metadata } from "next";
import { Button, LinkButton } from "@/components/admin/button";
import { GenerateBatch } from "@/components/admin/generate-batch";
import { ICON_DOWNLOAD, ICON_PLUS } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { QrCodesTable } from "@/components/admin/qr-codes-table";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createQrStore } from "@/lib/qr-store";
import { hasRole } from "@/services/admin-roles";
import { getQrOverview, parseQrQuery } from "@/services/qr";

export const metadata: Metadata = { title: "QR codes" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("viewer");
  const canEdit = hasRole(user.role, "admin");
  const store = createQrStore(getDb());
  const [overview, shops] = await Promise.all([
    getQrOverview(store, parseQrQuery(await searchParams)),
    canEdit ? store.shopsWithoutCode(500) : Promise.resolve([]),
  ]);
  const { counts } = overview;

  return (
    <>
      <PageHeader
        title="QR codes"
        subtitle="Printed codes never change. Assign them to shops when you sign them up."
        actions={
          <>
            {/* TODO(slice 6): print sheet of unassigned codes */}
            <Button icon={ICON_DOWNLOAD}>Print sheet (PDF)</Button>
            {canEdit ? (
              <LinkButton href="#generate-batch" variant="primary" icon={ICON_PLUS}>
                Generate codes
              </LinkButton>
            ) : null}
          </>
        }
      />

      <StatRow>
        <StatCard label="Total codes" value={String(counts.total)} />
        <StatCard label="Assigned" value={String(counts.assigned)} />
        <StatCard label="Unassigned, in stock" value={String(counts.unassigned)} />
        <StatCard label="Retired" value={String(counts.retired)} />
      </StatRow>

      <div className="flex flex-wrap items-start gap-4">
        <QrCodesTable overview={overview} shops={shops} canEdit={canEdit} />
        <GenerateBatch canEdit={canEdit} />
      </div>
    </>
  );
}
