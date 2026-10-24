import { timingSafeEqual } from "node:crypto";

// Vercel sends "Authorization: Bearer $CRON_SECRET" to a cron route when
// CRON_SECRET is set on the project. Without the secret every call is refused.
export function cronAuthorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
