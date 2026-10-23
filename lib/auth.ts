import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { getDb } from "./db";

// Username and password only. Sign-up is closed: accounts come from the seed
// script now and from the owner in Settings later (slice 9). BETTER_AUTH_SECRET
// and BETTER_AUTH_URL are read from the environment by Better Auth itself.
function createAuth() {
  return betterAuth({
    database: prismaAdapter(getDb(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      // Cookies are Secure in production by default.
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    // Counters live in the database (the rateLimit table), because serverless
    // instances do not share memory. Better Auth ignores rate limits in
    // development unless enabled, so enable them everywhere.
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/username": { window: 60, max: 5 },
      },
    },
    plugins: [username(), nextCookies()], // nextCookies must be last
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

// Created on first use so a build without DATABASE_URL still succeeds.
export function getAuth(): Auth {
  return (instance ??= createAuth());
}
