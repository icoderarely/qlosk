"use server";

import { signIn, signOut } from "@/lib/auth";

// Both actions are open to anyone on purpose: signing in is how a person
// becomes an admin (the allowlist is enforced in the signIn callback), and
// signing out needs no privilege. Every other admin action must start with
// requireAdmin({ write: true }) from @/lib/admin-guard.

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/admin" });
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}
