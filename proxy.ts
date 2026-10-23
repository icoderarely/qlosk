import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getRole } from "@/services/admin-roles";

// Next.js 16 calls this file "proxy" (it was "middleware"); it runs on Node, so
// it can validate the session against the database. That gives real 307s:
//   signed out, /admin/...  -> /admin-login
//   signed in, /admin-login -> /admin
// It is a convenience, not the security boundary. Pages, the admin layout and
// every server action call requireRole() themselves (lib/require-role.ts).
export async function proxy(request: NextRequest) {
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
  matcher: ["/admin", "/admin/:path*", "/admin-login"],
};
