import { createHmac } from "node:crypto";

// Tap tokens are signed with a key derived from BETTER_AUTH_SECRET, so there is
// no extra secret to set. IP_HASH_SALT salts the daily visitor hash; without it
// the hash is left empty rather than made from an unsalted IP.
export function trackingKeys(): { tokenKey: string; salt: string | null } {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set. See .env.example.");
  const salt = process.env.IP_HASH_SALT || null;
  if (!salt && process.env.NODE_ENV === "production") {
    console.warn("IP_HASH_SALT is not set: scans are logged without a visitor hash.");
  }
  return { tokenKey: createHmac("sha256", secret).update("tap-token").digest("hex"), salt };
}
