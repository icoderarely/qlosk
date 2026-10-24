import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { PlanPricesForm } from "@/components/admin/plan-prices-form";
import { RenewalsTable } from "@/components/admin/renewals-table";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { createBillingStore } from "@/lib/billing-store";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { hasRole } from "@/services/admin-roles";
import { getBilling } from "@/services/billing";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Plans and billing" };

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
  const billing = await getBilling(createBillingStore(getDb()));
  const canEdit = hasRole(user.role, "admin");

  return (
    <>
      <PageHeader
        title="Plans and billing"
        subtitle="Who is on which plan, and who needs a reminder. Payments are marked by hand for now."
      />

      <StatRow>
        {billing.planCounts.map((p) => (
          <StatCard key={p.plan} label={p.plan} value={String(p.shops)} note={p.shops === 1 ? "shop" : "shops"} />
        ))}
        <StatCard
          label={`Due in ${billing.due.inDays} days`}
          value={String(billing.due.count)}
          note={`${billing.due.overdue} overdue`}
          tone="warn"
        />
      </StatRow>

      <div className="flex flex-wrap items-start gap-4">
        <RenewalsTable rows={billing.renewals} canEdit={canEdit} />
        <PlanPricesForm prices={billing.prices} canEdit={canEdit} />
      </div>
    </>
  );
}
