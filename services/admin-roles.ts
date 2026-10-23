// Role rules (spec sections 4 and 8). No Next.js imports. Relative imports
// only, so these functions also run under `node --test`.

export type Role = "owner" | "admin" | "viewer";

const RANK: Record<Role, number> = { viewer: 1, admin: 2, owner: 3 };

// The only database surface this service needs. The Prisma client satisfies it.
export type RoleStore = {
  adminRole: {
    findUnique(args: { where: { userId: string } }): Promise<{ role: Role } | null>;
  };
};

// null means the account has no row in admin_roles and may not use the admin.
export async function getRole(store: RoleStore, userId: string): Promise<Role | null> {
  const row = await store.adminRole.findUnique({ where: { userId } });
  return row?.role ?? null;
}

// "At least": requireRole('admin') lets admin and owner in, never viewer.
export function hasRole(role: Role | null, atLeast: Role): boolean {
  return role !== null && RANK[role] >= RANK[atLeast];
}
