import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { createTrackingStore } from "@/lib/tracking-store";
import { trackingKeys } from "@/lib/tracking-env";
import { clientIp, handleTap, isIgnoredRequest } from "@/services/tracking";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A button tap (spec section 3): check the token the page was rendered with, log
// the tap, send the visitor to the real target. https targets get a 302. A tel:
// target gets a tiny page that opens the dialler, because browsers are not
// consistent about following an HTTP redirect to tel:.
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]/[linkId]">) {
  const { code, linkId } = await ctx.params;
  const keys = trackingKeys();
  const outcome = await handleTap(
    createTrackingStore(getDb()),
    code,
    linkId,
    request.nextUrl.searchParams.get("t"),
    {
      ip: clientIp(request.headers.get("x-forwarded-for")),
      userAgent: request.headers.get("user-agent"),
      skipLog: isIgnoredRequest(request.method, request.headers),
    },
    keys,
  );
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };

  if (outcome.kind === "notfound") {
    return new NextResponse("Not found", { status: 404, headers });
  }
  if (outcome.target.startsWith("tel:")) {
    const t = escapeHtml(outcome.target);
    return new NextResponse(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${t}"><title>Calling</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 24px"><p><a href="${t}" style="display:inline-block;min-height:44px;padding:12px 24px;border-radius:10px;background:#111;color:#fff;font-weight:700;text-decoration:none">Tap to call</a></p></body></html>`,
      { status: 200, headers: { ...headers, "content-type": "text/html; charset=utf-8" } },
    );
  }
  return NextResponse.redirect(outcome.target, { status: 302, headers });
}

// HEAD gets the same answer as GET but is never logged.
export const HEAD = GET;
