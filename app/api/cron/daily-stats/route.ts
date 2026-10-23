import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { createRollupStore } from "@/lib/rollup-store";
import { rebuildDailyStats } from "@/services/daily-stats";

// Nightly rollup, started by the Vercel cron in vercel.json. Vercel sends
// "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set on the project.
// Without the secret configured the route refuses everything.
function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await rebuildDailyStats(createRollupStore(getDb()));
  return Response.json({ ok: true, ...result });
}
