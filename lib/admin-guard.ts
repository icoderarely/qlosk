import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAdminByEmail, roleCanWrite } from "@/services/admin-users";
import type { AdminRecord } from "@/services/admin-users";
import { auth } from "./auth";
import { getDb } from "./db";

export type AdminSession = AdminRecord & {
  name: string | null;
  image: string | null;
};

// The signed-in person if they are on the allowlist right now, else null.
// proxy.ts only checks that a session cookie is valid; this checks the
// database, so removing an email takes effect immediately.
export async function getCurrentAdmin(): Promise<AdminSession | null> {
  // auth() can mint a CSRF token with crypto.getRandomValues(), which Cache
  // Components rejects during prerendering. Opt in to request time first.
  await connection();
  const session = await auth();
  const email = session?.user?.email;
  if (!session || !email) return null;
  const admin = await getAdminByEmail(getDb(), email);
  if (!admin) return null;
  return {
    ...admin,
    name: session.user?.name ?? null,
    image: session.user?.image ?? null,
  };
}

// Call this first in every admin page and every server action. Pass
// { write: true } for anything that changes data; viewers are refused.
export async function requireAdmin(
  options: { write?: boolean } = {},
): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (options.write && !roleCanWrite(admin.role)) {
    throw new Error("Your role cannot make changes.");
  }
  return admin;
}
