import type { Metadata } from "next";
import { Button } from "@/components/admin/button";
import { Card } from "@/components/admin/card";
import { Chip, type ChipTone } from "@/components/admin/chip";
import { DataTable, Td, Th } from "@/components/admin/data-table";
import { formatNumber } from "@/components/admin/format";
import { ICON_CHEVRON_DOWN, ICON_DOWNLOAD } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { requireRole } from "@/lib/require-role";
import { getReports, type ReportsData } from "@/services/stats";

export const metadata: Metadata = { title: "Reports" };

const FLAG_TONE: Record<ReportsData["byShop"][number]["flag"], ChipTone> = {
  clean: "green",
  spike: "amber",
  quiet: "amber",
};

export default async function Page() {
  await requireRole("viewer");
  const reports = await getReports();

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Real phone scans only. Bots and link previews are filtered out and kept for review."
        actions={
          <>
            {/* TODO(slice 8): date range picker; CSV export */}
            <Button iconAfter={ICON_CHEVRON_DOWN}>Last 30 days</Button>
            <Button icon={ICON_DOWNLOAD}>Download CSV</Button>
          </>
        }
      />

      <StatRow>
        {reports.kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} note={k.note} tone={k.tone} />
        ))}
      </StatRow>

      <div className="flex flex-wrap items-start gap-4">
        <Card aria-label="By shop" className="flex-[2_1_520px] overflow-hidden p-0">
          <div className="border-b border-line-soft px-5 py-4">
            <h2 className="m-0 text-base font-extrabold">By shop</h2>
          </div>
          <DataTable
            minWidth={560}
            head={
              <>
                <Th className="pl-5">Shop</Th>
                <Th className="text-right">Scans</Th>
                <Th className="text-right">Taps</Th>
                <Th className="text-right">Tap rate</Th>
                <Th>Top button</Th>
                <Th className="pr-5">Flags</Th>
              </>
            }
          >
            {reports.byShop.map((r) => (
              <tr key={r.name}>
                <Td className="pl-5 font-bold">{r.name}</Td>
                <Td className="text-right">{formatNumber(r.scans)}</Td>
                <Td className="text-right">{formatNumber(r.taps)}</Td>
                <Td className="text-right">{r.tapRate === null ? "None" : `${r.tapRate}%`}</Td>
                <Td>{r.topButton ?? "None"}</Td>
                <Td className="pr-5">
                  <Chip tone={FLAG_TONE[r.flag]}>{r.flagLabel}</Chip>
                </Td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="m-0 text-base font-extrabold">Traffic quality</h2>
            <div className="flex flex-wrap gap-5">
              <div>
                <div className="text-[13px] text-muted">Counted</div>
                <div className="text-2xl font-extrabold">{formatNumber(reports.traffic.counted)}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted">Filtered</div>
                <div className="text-2xl font-extrabold">{formatNumber(reports.traffic.filtered)}</div>
              </div>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 border-t border-line-soft p-0 pt-2.5">
              {reports.traffic.reasons.map((r) => (
                <li key={r.label} className="flex justify-between gap-3">
                  <span>{r.label}</span>
                  <span className="font-bold">{formatNumber(r.count)}</span>
                </li>
              ))}
            </ul>
          </Card>

          {reports.unusual.map((u) => (
            <Card
              key={u.shop}
              className="flex flex-col gap-2.5 border-review-line bg-review-bg p-5"
            >
              <div className="flex items-center justify-between gap-2.5">
                <h2 className="m-0 text-base font-extrabold">Unusual traffic</h2>
                <Chip tone="amber">{reports.unusual.length} to review</Chip>
              </div>
              <div className="font-bold">{u.shop}</div>
              <p className="m-0 text-[13px] text-muted">{u.detail}</p>
              {/* TODO(slice 7): Count them / Mark as bots changes the spike_review events */}
              <div className="flex flex-wrap gap-2.5">
                <Button>Count them</Button>
                <Button>Mark as bots</Button>
              </div>
            </Card>
          ))}

          <Card className="flex flex-col gap-2.5 p-5">
            <h2 className="m-0 text-base font-extrabold">Monthly WhatsApp report</h2>
            <p className="m-0 text-[13px] text-muted">{reports.monthly.text}</p>
            {/* TODO(slice 8): preview a report; resend failed */}
            <div className="flex flex-wrap gap-2.5">
              <Button>Preview a report</Button>
              <Button>Resend failed</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
