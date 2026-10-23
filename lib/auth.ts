import NextAuth from "next-auth";
import { canSignIn } from "@/services/admin-users";
import { authConfig } from "./auth.config";
import { getDb } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    // Only verified Google addresses that are in admin_users may sign in.
    // Returning false sends the user to the login page with AccessDenied.
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile) return false;
      return canSignIn(getDb(), profile);
    },
  },
});
