import { after, NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { createTrackingStore } from "@/lib/tracking-store";
import { trackingKeys } from "@/lib/tracking-env";
import { clientIp, handleScan, isIgnoredRequest } from "@/services/tracking";

// What the printed QR code opens (spec section 3): log the scan, then 302 to the
// shop's page. A code that is not assigned to a live shop shows the "not
// activated yet" page instead. Never cached: every scan must reach this code.
export async function GET(request: NextRequest, ctx: RouteContext<"/q/[code]">) {
  const { code } = await ctx.params;
  const outcome = await handleScan(
    createTrackingStore(getDb()),
    code,
    {
      ip: clientIp(request.headers.get("x-forwarded-for")),
      userAgent: request.headers.get("user-agent"),
      skipLog: isIgnoredRequest(request.method, request.headers),
    },
    trackingKeys().salt,
    new Date(),
    // Logging runs after the redirect is sent, so the visitor does not wait for it.
    (work) => after(work),
  );
  const to = outcome.kind === "redirect" ? `/s/${outcome.slug}` : "/not-activated";
  const response = NextResponse.redirect(new URL(to, request.url), 302);
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-robots-tag", "noindex");
  return response;
}

// HEAD gets the same answer as GET but is never logged (the visitor above says so).
export const HEAD = GET;
