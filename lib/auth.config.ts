import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Everything here is safe to load from proxy.ts (no database). The allowlist
// check lives in lib/auth.ts.
export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  trustHost: true,
} satisfies NextAuthConfig;
