import { cronAuthorised } from "@/lib/cron-auth";
import { getDb } from "@/lib/db";
import { createRollupStore } from "@/lib/rollup-store";
import { rebuildDailyStats } from "@/services/daily-stats";

// Nightly rollup, started by the Vercel cron in vercel.json. Vercel sends
// "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set on the project.

export async function GET(request: Request) {
  if (!cronAuthorised(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await rebuildDailyStats(createRollupStore(getDb()));
  return Response.json({ ok: true, ...result });
}
