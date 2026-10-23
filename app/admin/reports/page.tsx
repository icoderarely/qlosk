import type { Metadata } from "next";
import { ActionLink } from "@/components/admin/action-link";
import { buttonClass, DownloadButton } from "@/components/admin/button";
import { Card } from "@/components/admin/card";
import { Chip, type ChipTone } from "@/components/admin/chip";
import { DataTable, Td, Th } from "@/components/admin/data-table";
import { SelectField } from "@/components/admin/form-field";
import { formatNumber } from "@/components/admin/format";
import { ICON_DOWNLOAD } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { RangePicker } from "@/components/admin/range-picker";
import { SpikeReviewCard } from "@/components/admin/spike-review-card";
import { StatCard, StatRow } from "@/components/admin/stat-card";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createStatsStore } from "@/lib/stats-store";
import { hasRole } from "@/services/admin-roles";
import { getReports, parseRange, type ReportShopFlag } from "@/services/stats";

export const metadata: Metadata = { title: "Reports" };

const FLAG_TONE: Record<ReportShopFlag, ChipTone> = {
  clean: "green",
  spike: "amber",
  quiet: "amber",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("viewer");
  const params = await searchParams;
  const range = parseRange(params.range);
  const report = typeof params.report === "string" ? params.report : null;
  const reports = await getReports(createStatsStore(getDb()), range, new Date(), report);
  const { monthly } = reports;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Real phone scans only. Bots and link previews are filtered out and kept for review. Numbers are updated nightly."
        actions={
          <>
            <RangePicker value={range} />
            <DownloadButton href={`/admin/reports/export?range=${range}`} icon={ICON_DOWNLOAD}>
              Download CSV
            </DownloadButton>
          </>
        }
      />

      <StatRow>
        {reports.kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.label === "Busiest day" ? k.value : formatNumber(Number(k.value))}
            note={k.note}
            tone={k.tone}
          />
        ))}
      </StatRow>

      <div className="flex flex-wrap items-start gap-4">
        <Card aria-label="By shop" className="flex-[2_1_520px] overflow-hidden p-0">
          <div className="border-b border-line-soft px-5 py-4">
            <h2 className="m-0 text-base font-extrabold">By shop</h2>
          </div>
          {reports.byShop.length === 0 ? <p className="m-0 px-5 py-4 text-muted">No shops with scans yet.</p> : null}
          {reports.byShop.length > 0 ? (
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
                <tr key={r.shopId}>
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
          ) : null}
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
            <p className="m-0 text-[13px] text-muted">Scans and button taps together.</p>
            {reports.traffic.reasons.length === 0 ? <p className="m-0 text-muted">Nothing was filtered.</p> : null}
            {reports.traffic.reasons.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-2 border-t border-line-soft p-0 pt-2.5">
                {reports.traffic.reasons.map((r) => (
                  <li key={r.label} className="flex justify-between gap-3">
                    <span>{r.label}</span>
                    <span className="font-bold">{formatNumber(r.count)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          {reports.unusual.map((u) => (
            <SpikeReviewCard key={u.shopId} item={u} total={reports.unusual.length} canEdit={hasRole(user.role, "admin")} />
          ))}

          <Card aria-label="Monthly report" className="flex flex-col gap-3 p-5">
            <h2 className="m-0 text-base font-extrabold">Monthly report, {monthly.monthLabel}</h2>
            <p className="m-0 text-[13px] text-muted">
              Previewed here and sent by hand on WhatsApp. {monthly.ready.length} ready
              {monthly.heldOut.length > 0 ? `, ${monthly.heldOut.length} held out for review` : ""}.
            </p>
            {monthly.heldOut.length > 0 ? (
              <p className="m-0 text-[13px]">
                <span className="font-bold">Held out until you decide: </span>
                {monthly.heldOut.map((h) => h.name).join(", ")}.
              </p>
            ) : null}
            {monthly.ready.length > 0 ? (
              <form method="get" className="flex flex-wrap items-end gap-2.5">
                <input type="hidden" name="range" value={range} />
                <div className="min-w-0 flex-[1_1_180px]">
                  <SelectField block label="Shop" name="report" defaultValue={monthly.preview?.shopId ?? ""}>
                    <option value="">Choose a shop</option>
                    {monthly.ready.map((e) => (
                      <option key={e.shopId} value={e.shopId}>
                        {e.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <button type="submit" className={buttonClass()}>
                  Preview a report
                </button>
              </form>
            ) : (
              <p className="m-0 text-muted">No live shops to report on yet.</p>
            )}
            {monthly.preview ? (
              <div className="flex flex-col gap-2.5">
                <pre
                  aria-label={`Report for ${monthly.preview.name}`}
                  className="m-0 whitespace-pre-wrap rounded-[10px] bg-ground p-3 font-[inherit] text-[13px]"
                >
                  {monthly.preview.text}
                </pre>
                {monthly.preview.whatsappHref ? (
                  <div>
                    <ActionLink href={monthly.preview.whatsappHref} external>
                      Send on WhatsApp
                    </ActionLink>
                  </div>
                ) : (
                  <p className="m-0 text-[13px] text-muted">Add the owner&apos;s WhatsApp number in the shop to send this.</p>
                )}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
