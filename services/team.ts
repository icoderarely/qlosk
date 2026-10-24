// Team accounts (slice 9). Only the owner adds, changes or removes them; the
// caller checks that with requireRole("owner"). Better Auth owns the user,
// session and account tables; an account with no row in admin_roles cannot use
// the admin, and requireRole reads that row on every request, so removing an
// account blocks it on its next request. No Next.js imports.
import { checkNewCredentials, checkPassword, normalizeUsername } from "./admin-accounts.ts";
import type { Role } from "./admin-roles.ts";

export type TeamMember = { id: string; username: string; role: Role };

/** Roles the owner can give. There is one owner, created by the seed script. */
export const TEAM_ROLES = ["admin", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export type TeamStore = {
  list(): Promise<TeamMember[]>;
  find(userId: string): Promise<TeamMember | null>;
  usernameTaken(username: string): Promise<boolean>;
  /** Makes the user, the credential account and the role in one transaction. */
  create(args: { username: string; passwordHash: string; role: TeamRole; userEmail: string }): Promise<string>;
  setRole(args: { userId: string; role: TeamRole; username: string; from: Role; userEmail: string }): Promise<void>;
  /** Sets the password and signs the account out everywhere. */
  setPassword(args: { userId: string; passwordHash: string; username: string; userEmail: string }): Promise<void>;
  /** Deletes the user; sessions, accounts and the role go with it. */
  remove(args: { userId: string; username: string; userEmail: string }): Promise<void>;
};

export type TeamResult = { ok: true; message: string } | { ok: false; error: string };
const fail = (error: string): TeamResult => ({ ok: false, error });

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && (TEAM_ROLES as readonly string[]).includes(value);
}

type Hash = (password: string) => Promise<string>;

export async function addMember(
  store: TeamStore,
  hash: Hash,
  input: { username: unknown; password: unknown; role: unknown },
  userEmail: string,
): Promise<TeamResult> {
  if (typeof input.username !== "string" || typeof input.password !== "string") return fail("Enter a username and a temporary password.");
  if (!isTeamRole(input.role)) return fail("Choose a role: admin or viewer.");
  const problems = checkNewCredentials(input.username, input.password);
  if (problems.length > 0) return fail(problems[0]);
  const username = normalizeUsername(input.username);
  if (await store.usernameTaken(username)) return fail("That username is already used.");
  await store.create({ username, passwordHash: await hash(input.password), role: input.role, userEmail });
  return { ok: true, message: `Account ${username} added. Give them the temporary password and ask them to change it after signing in.` };
}

export async function changeRole(store: TeamStore, userId: string, role: unknown, userEmail: string): Promise<TeamResult> {
  if (!isTeamRole(role)) return fail("Choose a role: admin or viewer.");
  const member = await store.find(userId);
  if (!member) return fail("This account no longer exists.");
  if (member.role === "owner") return fail("The owner account keeps its role.");
  if (member.role === role) return fail(`${member.username} is already ${role === "admin" ? "an admin" : "a viewer"}.`);
  await store.setRole({ userId, role, username: member.username, from: member.role, userEmail });
  return { ok: true, message: `${member.username} is now ${role === "admin" ? "an admin" : "a viewer"}.` };
}

export async function resetPassword(
  store: TeamStore,
  hash: Hash,
  userId: string,
  password: unknown,
  userEmail: string,
): Promise<TeamResult> {
  if (typeof password !== "string") return fail("Enter a new password.");
  const problems = checkPassword(password);
  if (problems.length > 0) return fail(problems[0]);
  const member = await store.find(userId);
  if (!member) return fail("This account no longer exists.");
  await store.setPassword({ userId, passwordHash: await hash(password), username: member.username, userEmail });
  return { ok: true, message: `New password set for ${member.username}. They are signed out everywhere.` };
}

export async function removeMember(store: TeamStore, userId: string, userEmail: string): Promise<TeamResult> {
  const member = await store.find(userId);
  if (!member) return fail("This account no longer exists.");
  if (member.role === "owner") return fail("The owner account cannot be removed.");
  await store.remove({ userId, username: member.username, userEmail });
  return { ok: true, message: `${member.username} was removed and can no longer sign in.` };
}
