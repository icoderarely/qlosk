import { cronAuthorised } from "@/lib/cron-auth";
import { getDb } from "@/lib/db";
import { createExpiryStore } from "@/lib/expiry-store";
import { runPlanExpiry } from "@/services/plans";

// Daily, started by the Vercel cron in vercel.json. Shops whose plan ended more
// than 15 days ago become "expired". The public page also checks the dates
// itself, so a day this job misses never shows the full page by mistake.
export async function GET(request: Request) {
  if (!cronAuthorised(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { expired } = await runPlanExpiry(createExpiryStore(getDb()));
  return Response.json({ ok: true, expired: expired.length });
}
