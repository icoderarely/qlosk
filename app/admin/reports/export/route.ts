import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createStatsStore } from "@/lib/stats-store";
import { getReports, parseRange, reportsCsv } from "@/services/stats";

// By-shop table as a CSV file. Same numbers as the page: daily_stats only.
export async function GET(request: Request) {
  await requireRole("viewer");
  const range = parseRange(new URL(request.url).searchParams.get("range") ?? undefined);
  const csv = reportsCsv(await getReports(createStatsStore(getDb()), range));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shop-report-last-${range}-days.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
