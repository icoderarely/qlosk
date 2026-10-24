// Plan dates and expiry (spec section 4): after a plan ends the page stays
// fully live for 15 days, then shows only the shop name, a Call button and
// Directions. The rules here are pure; the daily job and the public page both
// use them, so the page is right even on a day the job did not run.
// Also the landing page pricing cards (section 10). No Next.js imports.
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
  12: "Renewal reminder on WhatsApp",
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

// ---- Landing page pricing ----------------------------------------------------------

export type PricingRow = { id: string; months: number; pricePaise: number; compareAtPaise: number | null };

export type PricingStore = {
  /** The standard (not custom) plans, any order. */
  standardPlans(): Promise<PricingRow[]>;
};

export type PricingCard = {
  months: number;
  /** "1 month", "6 months", "1 year". */
  title: string;
  price: string;
  /** "/ month", "/ 6 months", "/ year". */
  per: string;
  /** Struck-out regular price. Null unless the plan has a higher compare-at price. */
  was: string | null;
  /** Under the price, such as "₹167 a month · save 44%". Empty when there is nothing true to say. */
  note: string;
  bestValue: boolean;
};

/** Rupees with Indian digit grouping: 359900 paise is "₹3,599". */
export function formatRupees(paise: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(paise / 100)}`;
}

export function planTitle(months: number): string {
  if (months === 12) return "1 year";
  return months === 1 ? "1 month" : `${months} months`;
}

function perLabel(months: number): string {
  if (months === 1) return "/ month";
  return months === 12 ? "/ year" : `/ ${months} months`;
}

/**
 * What the pricing section shows for one plan. A struck price appears only when
 * compare-at is set and higher than the price; the saving is worked out from it.
 * A plan with no price set yet is left out, so the page never shows "₹0".
 */
export function pricingCard(row: PricingRow): PricingCard | null {
  if (row.pricePaise <= 0) return null;
  const struck = row.compareAtPaise !== null && row.compareAtPaise > row.pricePaise ? row.compareAtPaise : null;
  const parts: string[] = [];
  if (row.months > 1) parts.push(`${formatRupees(Math.round(row.pricePaise / row.months / 100) * 100)} a month`);
  if (struck !== null) {
    parts.push(row.months > 1 ? `save ${Math.round((1 - row.pricePaise / struck) * 100)}%` : "Launch price");
  }
  return {
    months: row.months,
    title: planTitle(row.months),
    price: formatRupees(row.pricePaise),
    per: perLabel(row.months),
    was: struck === null ? null : formatRupees(struck),
    note: parts.join(" · "),
    bestValue: row.months === 12,
  };
}

/** The three standard plans as cards, shortest first. */
export async function landingPlans(store: PricingStore): Promise<PricingCard[]> {
  const rows = await store.standardPlans();
  return [1, 6, 12].flatMap((months) => {
    const row = rows.find((r) => r.months === months);
    const card = row ? pricingCard(row) : null;
    return card ? [card] : [];
  });
}

/** The note under the cards applies only when a 6 month or 1 year card shows a struck price. */
export function showsMultiMonthStrike(cards: PricingCard[]): boolean {
  return cards.some((c) => c.months > 1 && c.was !== null);
}
