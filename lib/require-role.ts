import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRole, hasRole } from "@/services/admin-roles";
import type { Role } from "@/services/admin-roles";
import { getAuth } from "./auth";
import { getDb } from "./db";

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
};

// The signed-in person if they have a row in admin_roles, else null. Reads the
// session from Better Auth and the role from the database on every call, so a
// removed or demoted account loses access at once. cache() makes the layout, the
// page and the action that runs in the same request share one lookup.
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const role = await getRole(getDb(), session.user.id);
  if (!role) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    username: session.user.username ?? session.user.name,
    email: session.user.email,
    role,
  };
});

// The one server-side check. Call it first in app/admin/layout.tsx, in every
// admin page and in every server action. Signed out sends you to /admin-login;
// a role that is too low throws, so a viewer cannot run a write action:
//   requireRole("viewer")  any account with a role
//   requireRole("admin")   admin or owner
//   requireRole("owner")   owner only
export async function requireRole(atLeast: Role): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin-login");
  if (!hasRole(user.role, atLeast)) {
    throw new Error("Your role cannot do this.");
  }
  return user;
}
