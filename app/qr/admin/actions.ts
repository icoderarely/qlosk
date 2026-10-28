"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

// Logging out needs no role: it only ends the caller's own session, and it
// works the same for a stale cookie. Every other admin action must start with
// requireRole("admin") (or "owner") from @/lib/require-role.
export async function logout() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/qr/admin-login");
}
