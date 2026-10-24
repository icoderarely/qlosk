// Plan dates and expiry (spec section 4): after a plan ends the page stays
// fully live for 15 days, then shows only the shop name, a Call button and
// Directions. The rules here are pure; the daily job and the public page both
// use them, so the page is right even on a day the job did not run.
// No Next.js imports.
import type { DbShopStatus } from "./shops.ts";

export const GRACE_DAYS = 15;
export const DUE_WINDOW_DAYS = 14;
const DAY_MS = 24 * 3600_000;

/** Calendar months later, clamped to the last day of a shorter month (31 Jan + 1 month = 28 or 29 Feb). */
export function addMonths(from: Date, months: number): Date {
  const out = new Date(from.getTime());
  const day = out.getUTCDate();
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() + months);
  const last = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, last));
  return out;
}

/** The moment the page drops to the reduced version. */
export function graceEnds(planEndsAt: Date): Date {
  return new Date(planEndsAt.getTime() + GRACE_DAYS * DAY_MS);
}

/** One line selling each plan length in the Change plan picker, by months. */
export const PLAN_PITCH: Record<number, string> = {
  1: "Try it, cancel before any month starts",
  6: "A full season, no big commitment",
  12: "Best value, renewal reminder on WhatsApp",
};

export type PaymentState = "paid" | "due_soon" | "overdue" | "not_started";

/** Paid: the plan runs more than 14 days. Due soon: it ends within 14 days. Overdue: it has ended. */
export function paymentState(planEndsAt: Date | null, now: Date): PaymentState {
  if (!planEndsAt) return "not_started";
  if (planEndsAt.getTime() < now.getTime()) return "overdue";
  return planEndsAt.getTime() - now.getTime() <= DUE_WINDOW_DAYS * DAY_MS ? "due_soon" : "paid";
}

/** Whether the public page shows only the name, Call and Directions. */
export function isReduced(shop: { status: DbShopStatus; planEndsAt: Date | null }, now: Date): boolean {
  if (shop.status === "expired") return true;
  return shop.planEndsAt !== null && now.getTime() >= graceEnds(shop.planEndsAt).getTime();
}

/**
 * The dates after "Mark as paid". Paying before the plan ends adds the new
 * period on to the end date, so nothing already paid for is lost. Paying after
 * it has ended (or with no plan dates yet) starts a fresh period today.
 */
export function renewalDates(args: {
  planStartedAt: Date | null;
  planEndsAt: Date | null;
  months: number;
  now: Date;
}): { planStartedAt: Date; planEndsAt: Date } {
  const { planStartedAt, planEndsAt, months, now } = args;
  if (planEndsAt && planEndsAt.getTime() > now.getTime()) {
    return { planStartedAt: planStartedAt ?? now, planEndsAt: addMonths(planEndsAt, months) };
  }
  return { planStartedAt: now, planEndsAt: addMonths(now, months) };
}

/** The status after a renewal: an expired shop comes back; everything else stays. */
export function statusAfterRenewal(status: DbShopStatus, hasPublished: boolean): DbShopStatus {
  if (status !== "expired") return status;
  return hasPublished ? "live" : "building";
}

// ---- Daily expiry job ----------------------------------------------------------

export type ExpiryStore = {
  /** Live and quiet shops that have plan dates. */
  candidates(): Promise<{ id: string; name: string; status: DbShopStatus; planEndsAt: Date | null }[]>;
  /** Sets status to expired and writes a change_log row for each, in one transaction. */
  markExpired(shops: { id: string; name: string; planEndsAt: Date }[]): Promise<void>;
};

export async function runPlanExpiry(store: ExpiryStore, now: Date = new Date()): Promise<{ expired: string[] }> {
  const due = (await store.candidates()).flatMap((s) =>
    (s.status === "live" || s.status === "quiet") && s.planEndsAt && isReduced(s, now)
      ? [{ id: s.id, name: s.name, planEndsAt: s.planEndsAt }]
      : [],
  );
  if (due.length > 0) await store.markExpired(due);
  return { expired: due.map((s) => s.name) };
}
