import type { Metadata } from "next";
import { LinkButton } from "@/components/admin/button";
import { GenerateBatch } from "@/components/admin/generate-batch";
import { ICON_PLUS } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { QrCodesTable } from "@/components/admin/qr-codes-table";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { qrBaseUrl } from "@/lib/print-assets";
import { requireRole } from "@/lib/require-role";
import { createQrStore } from "@/lib/qr-store";
import { hasRole } from "@/services/admin-roles";
import { qrSvg, qrTarget } from "@/services/print";
import { getQrOverview, parseQrQuery } from "@/services/qr";
import { Suspense } from "react";

export const metadata: Metadata = { title: "QR codes" };

// The session is request-time data, so the page body sits behind its own Suspense
// boundary: a navigation into this page can show the fallback instead of blocking.
export default function Page(props: Parameters<typeof Body>[0]) {
  return (
    <Suspense fallback={<div className="min-h-[50dvh]" role="status" aria-label="Loading" />}>
      <Body {...props} />
    </Suspense>
  );
}

async function Body({
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

  // The QR images are drawn here, on the server, from the same address the
  // printed files use. With no QR address set (production) the column stays empty.
  const qrSvgs: Record<string, string> = {};
  let qrBase: string | null = null;
  try {
    const base = qrBaseUrl((await loadSettings()).domain.qrBase);
    qrBase = qrTarget(base, overview.rows[0]?.code ?? "AAAAAA").replace(/\/q\/[^/]+$/, "");
    for (const r of overview.rows) qrSvgs[r.code] = qrSvg(qrTarget(base, r.code));
  } catch {
    qrBase = null;
  }

  return (
    <>
      <PageHeader
        title="QR codes"
        subtitle="Printed codes never change. Assign them to shops when you sign them up."
        actions={
          <>
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
        <QrCodesTable overview={overview} shops={shops} canEdit={canEdit} qrSvgs={qrSvgs} qrBase={qrBase} />
        <GenerateBatch canEdit={canEdit} />
      </div>
    </>
  );
}
