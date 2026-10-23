import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Next.js 16 calls this file "proxy" (it was "middleware"). This is the first
// gate: no valid session, no /admin. It cannot check the allowlist because it
// does not touch the database; requireAdmin() does that in pages and actions.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (!req.auth) {
    const login = new URL("/admin/login", req.nextUrl);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
