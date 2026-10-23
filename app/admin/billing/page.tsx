import type { Metadata } from "next";
import { Button } from "@/components/admin/button";
import { Card } from "@/components/admin/card";
import { DataTable, Td, Th } from "@/components/admin/data-table";
import { TextField } from "@/components/admin/form-field";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { PaymentChip } from "@/components/admin/status-chip";
import { requireRole } from "@/lib/require-role";
import { getBilling } from "@/services/billing";

export const metadata: Metadata = { title: "Plans and billing" };

export default async function Page() {
  await requireRole("viewer");
  const billing = await getBilling();

  return (
    <>
      <PageHeader
        title="Plans and billing"
        subtitle="Who is on which plan, and who needs a reminder."
        actions={
          // TODO(slice 9): send every due reminder
          <Button>Send all due reminders</Button>
        }
      />

      <StatRow>
        {billing.planCounts.map((p) => (
          <StatCard key={p.plan} label={p.plan} value={String(p.shops)} note="shops" />
        ))}
        <StatCard
          label={`Due in ${billing.due.inDays} days`}
          value={String(billing.due.count)}
          note={`${billing.due.overdue} overdue`}
          tone="warn"
        />
      </StatRow>

      <div className="flex flex-wrap items-start gap-4">
        <Card aria-label="Renewals" className="flex-[2_1_560px] overflow-hidden p-0">
          <div className="border-b border-line-soft px-5 py-4">
            <h2 className="m-0 text-base font-extrabold">Renewals</h2>
          </div>
          <DataTable
            minWidth={600}
            head={
              <>
                <Th className="pl-5">Shop</Th>
                <Th>Plan</Th>
                <Th>Renews or ends</Th>
                <Th>Payment</Th>
                <Th className="pr-5">
                  <span className="sr-only">Actions</span>
                </Th>
              </>
            }
          >
            {/* TODO(slice 9): Remind, Call and View act on the renewal */}
            {billing.renewals.map((r) => (
              <tr key={r.shop}>
                <Td className="pl-5 font-bold">{r.shop}</Td>
                <Td>{r.plan}</Td>
                <Td>{r.date}</Td>
                <Td>
                  <PaymentChip status={r.payment} />
                </Td>
                <Td className="pr-5 text-right">
                  <Button aria-label={`${r.action} ${r.shop}`}>{r.action}</Button>
                </Td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <Card aria-label="Plan prices" className="flex flex-[1_1_320px] flex-col gap-3.5 p-5">
          <h2 className="m-0 text-base font-extrabold">Plan prices</h2>
          {billing.prices.map((p) => (
            <TextField
              key={p.plan}
              block
              label={p.label}
              inputMode="decimal"
              placeholder="[price in rupees]"
              defaultValue={p.rupees}
            />
          ))}
          <p className="m-0 text-[13px] text-muted">
            After a plan ends, the page stays fully live for 15 more days, then shows only the shop
            name, a Call button and Directions.
          </p>
          {/* TODO(slice 9): save prices to the plans table */}
          <Button variant="primary">Save prices</Button>
        </Card>
      </div>
    </>
  );
}
