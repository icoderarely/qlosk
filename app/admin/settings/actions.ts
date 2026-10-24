"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { checkPassword } from "@/services/admin-accounts";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createSettingsStore } from "@/lib/settings-store";
import { createTeamStore } from "@/lib/team-store";
import { saveSettings } from "@/services/settings";
import { addMember, changeRole, removeMember, resetPassword } from "@/services/team";

// Thin on purpose: role check first, then the service. Team accounts are the
// owner's alone; the rest of Settings is for admins and the owner. A viewer's
// call throws in requireRole before anything is read or written.

export type SettingsActionResult = { ok: true; message: string } | { ok: false; error: string };

const idSchema = z.uuid();
const NO_USER: SettingsActionResult = { ok: false, error: "Choose an account." };

function refresh() {
  revalidatePath("/admin/settings");
}

export async function saveAllSettings(input: unknown): Promise<SettingsActionResult> {
  const user = await requireRole("admin");
  const result = await saveSettings(createSettingsStore(getDb()), input, {
    canEditDomain: user.role === "owner",
    userEmail: user.email,
  });
  if (result.ok) {
    refresh();
    // Shops, the playground and the not-activated page read these too.
    revalidatePath("/admin/shops", "layout");
    revalidatePath("/playground");
  }
  return result;
}

export async function addTeamAccount(input: unknown): Promise<SettingsActionResult> {
  const user = await requireRole("owner");
  const parsed = z.object({ username: z.string(), password: z.string(), role: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a username, a temporary password and a role." };
  const result = await addMember(createTeamStore(getDb()), hashPassword, parsed.data, user.email);
  if (result.ok) refresh();
  return result;
}

export async function changeTeamRole(userId: unknown, role: unknown): Promise<SettingsActionResult> {
  const user = await requireRole("owner");
  const id = idSchema.safeParse(userId);
  if (!id.success) return NO_USER;
  const result = await changeRole(createTeamStore(getDb()), id.data, role, user.email);
  if (result.ok) refresh();
  return result;
}

export async function resetTeamPassword(userId: unknown, password: unknown): Promise<SettingsActionResult> {
  const user = await requireRole("owner");
  const id = idSchema.safeParse(userId);
  if (!id.success) return NO_USER;
  const result = await resetPassword(createTeamStore(getDb()), hashPassword, id.data, password, user.email);
  if (result.ok) refresh();
  return result;
}

export async function removeTeamAccount(userId: unknown): Promise<SettingsActionResult> {
  const user = await requireRole("owner");
  const id = idSchema.safeParse(userId);
  if (!id.success) return NO_USER;
  const result = await removeMember(createTeamStore(getDb()), id.data, user.email);
  if (result.ok) refresh();
  return result;
}

// Anyone with a role can change their own password. Other sessions are signed out.
export async function changeMyPassword(current: unknown, next: unknown): Promise<SettingsActionResult> {
  await requireRole("viewer");
  if (typeof current !== "string" || typeof next !== "string" || current === "") {
    return { ok: false, error: "Enter your current password and a new one." };
  }
  const problems = checkPassword(next);
  if (problems.length > 0) return { ok: false, error: problems[0] };
  try {
    await getAuth().api.changePassword({
      headers: await headers(),
      body: { currentPassword: current, newPassword: next, revokeOtherSessions: true },
    });
  } catch {
    return { ok: false, error: "Your current password is wrong." };
  }
  return { ok: true, message: "Password changed. Other devices were signed out." };
}
