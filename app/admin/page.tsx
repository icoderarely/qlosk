import type { Metadata } from "next";
import { Button, LinkButton } from "@/components/admin/button";
import { Card } from "@/components/admin/card";
import { DataTable, Td, Th } from "@/components/admin/data-table";
import { formatCode, formatScans } from "@/components/admin/format";
import { ICON_CHEVRON_DOWN, ICON_PLUS } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { ScansChart } from "@/components/admin/scans-chart";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { StatusChip } from "@/components/admin/status-chip";
import { requireRole } from "@/lib/require-role";
import { getOverview } from "@/services/stats";

export const metadata: Metadata = { title: "Overview" };

export default async function Page() {
  await requireRole("viewer");
  const overview = await getOverview();

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Everything across your shops, last 30 days."
        actions={
          <>
            {/* TODO(slice 8): date range picker */}
            <Button iconAfter={ICON_CHEVRON_DOWN}>Last 30 days</Button>
            <LinkButton href="/admin/shops/new" variant="primary" icon={ICON_PLUS}>
              New shop
            </LinkButton>
          </>
        }
      />

      <StatRow>
        {overview.kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} note={k.note} tone={k.tone} />
        ))}
      </StatRow>

      <div className="flex flex-wrap gap-4">
        <Card aria-label="Scans per day" className="flex-[2_1_480px] p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-base font-extrabold">Scans per day</h2>
            <span className="text-[13px] text-muted">Counted scans, all shops</span>
          </div>
          <ScansChart series={overview.scansSeries} axis={overview.scansAxis} />
        </Card>
        <Card aria-label="Most used buttons" className="flex flex-[1_1_300px] flex-col gap-3.5 p-5">
          <h2 className="m-0 text-base font-extrabold">Most used buttons</h2>
          {overview.buttons.map((b) => (
            <div key={b.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between font-semibold">
                <span>{b.label}</span>
                <span className="text-muted">{b.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-line-soft">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${b.percent}%` }}
                />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Card aria-label="Needs attention" className="flex-[1_1_340px] p-5">
          <h2 className="m-0 mb-2 text-base font-extrabold">Needs attention</h2>
          {/* TODO(slice 8): each action sends the reminder or opens the shop */}
          {overview.attention.map((a) => (
            <div
              key={a.title}
              className="flex items-center justify-between gap-3 border-t border-line-soft py-3"
            >
              <div className="min-w-0">
                <div className="font-bold">{a.title}</div>
                <div className="text-[13px] text-muted">{a.detail}</div>
              </div>
              <Button aria-label={`${a.action}: ${a.title}, ${a.detail}`}>{a.action}</Button>
            </div>
          ))}
        </Card>

        <Card aria-label="Recent shops" className="flex-[2_1_520px] p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-base font-extrabold">Recent shops</h2>
            <LinkButton href="/admin/shops">View all shops</LinkButton>
          </div>
          <DataTable
            minWidth={540}
            head={
              <>
                <Th>Shop</Th>
                <Th>Code</Th>
                <Th>Plan</Th>
                <Th className="text-right">Scans, 30 days</Th>
                <Th>Status</Th>
              </>
            }
          >
            {overview.recentShops.map((r) => (
              <tr key={r.id}>
                <Td className="font-bold">{r.name}</Td>
                <Td className="font-code text-[13px]">{formatCode(r.code)}</Td>
                <Td>{r.plan}</Td>
                <Td className="text-right font-semibold">{formatScans(r.scans)}</Td>
                <Td>
                  <StatusChip status={r.status} />
                </Td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
