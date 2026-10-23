// Admin allowlist rules (spec sections 3 and 8). No Next.js imports. Relative
// imports only, so these functions also run under `node --test`.

export type AdminRole = "owner" | "admin" | "viewer";

export type AdminRecord = { email: string; role: AdminRole };

// The only database surface this service needs. The Prisma client satisfies it.
export type AdminUserStore = {
  adminUser: {
    findUnique(args: {
      where: { email: string };
    }): Promise<AdminRecord | null>;
  };
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Returns the role for an allowlisted email, or null when the email may not
// sign in. Matching is exact on the lowercased address.
export async function getAdminByEmail(
  store: AdminUserStore,
  email: string | null | undefined,
): Promise<AdminRecord | null> {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return store.adminUser.findUnique({ where: { email: normalized } });
}

// Viewers can read the admin but cannot change anything.
export function roleCanWrite(role: AdminRole): boolean {
  return role === "owner" || role === "admin";
}

// Google can return an address it has not verified. Only a verified address
// may be matched against the allowlist.
export async function canSignIn(
  store: AdminUserStore,
  profile: { email?: string | null; email_verified?: boolean | null },
): Promise<boolean> {
  if (profile.email_verified !== true) return false;
  return (await getAdminByEmail(store, profile.email)) !== null;
}
