import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createPublicStore } from "@/lib/public-page-store";
import { getRole } from "@/services/admin-roles";
import { routeFor } from "@/services/public-page";

// Next.js 16 calls this file "proxy" (it was "middleware"); it runs on Node, so
// it can validate the session against the database. That gives real 307s:
//   signed out, /admin/...  -> /admin-login
//   signed in, /admin-login -> /admin
// It also forwards old shop addresses (/s/<old-slug>) with a 301.
// The admin part is a convenience, not the security boundary. Pages, the admin layout and
// every server action call requireRole() themselves (lib/require-role.ts).
const NOT_FOUND_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title></head><body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;background:#fafafa;color:#171717"><main style="max-width:24rem"><h1 style="margin:0;font-size:24px">This page is not available</h1><p style="margin:12px 0 0;color:#404040">The address may have been typed wrong, or the shop has not published its page yet.</p></main></body></html>`;

export async function proxy(request: NextRequest) {
  // Public shop addresses get their real HTTP answer here, before any page is
  // rendered (the page itself streams, so it could only say 200): a shop's old
  // address is a 301 to the new one, an unknown one is a 404, a live one falls
  // through to the page.
  const shopPath = /^\/s\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  if (shopPath) {
    const route = await routeFor(createPublicStore(getDb()), shopPath[1]);
    if (route.kind === "redirect") {
      return NextResponse.redirect(new URL(`/s/${route.slug}${request.nextUrl.search}`, request.url), 301);
    }
    if (route.kind === "notfound") {
      return new NextResponse(NOT_FOUND_HTML, {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
      });
    }
    return NextResponse.next();
  }

  const session = await getAuth().api.getSession({ headers: request.headers });
  const role = session ? await getRole(getDb(), session.user.id) : null;
  const signedIn = role !== null;
  const onLogin = request.nextUrl.pathname === "/admin-login";

  if (onLogin && signedIn) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  if (!onLogin && !signedIn) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/admin-login", "/s/:slug"],
};
