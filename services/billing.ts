// Plans and billing (slice 9). Billing is tracked by hand: Mark as paid renews
// the plan; there is no payment gateway yet (spec section 1). Prices live in
// plans.price_paise and are edited here, never in code. Reads and writes go
// through a BillingStore (lib/billing-store.ts is the Prisma one).
// No Next.js imports.
import { telTarget, whatsappTarget } from "./links.ts";
import {
  DUE_WINDOW_DAYS,
  graceEnds,
  paymentState,
  renewalDates,
  statusAfterRenewal,
  type PaymentState,
} from "./plans.ts";
import type { Decision } from "./qr.ts";
import type { DbShopStatus } from "./shops.ts";

const MAX_PRICE_RUPEES = 1_000_000;

export type PlanRow = { id: string; name: string; months: number; pricePaise: number };

export type BillingShop = {
  id: string;
  name: string;
  status: DbShopStatus;
  planId: string | null;
  planStartedAt: Date | null;
  planEndsAt: Date | null;
  hasPublished: boolean;
  phone: string | null;
  ownerName: string | null;
  ownerWhatsapp: string | null;
};

export type BillingStore = {
  plans(): Promise<PlanRow[]>;
  /** Shops that are not archived. */
  shops(): Promise<BillingShop[]>;
  find(shopId: string): Promise<BillingShop | null>;
  renew(args: {
    shopId: string;
    planStartedAt: Date;
    planEndsAt: Date;
    status: DbShopStatus;
    what: string;
    userEmail: string;
  }): Promise<void>;
  /** Writes the new prices and one change_log row, in one transaction. */
  setPrices(args: { prices: { id: string; pricePaise: number }[]; what: string; userEmail: string }): Promise<void>;
};

export type RenewalRow = {
  shopId: string;
  shop: string;
  plan: string;
  date: string;
  payment: PaymentState;
  /** wa.me link with a reminder filled in, or null when no owner number is saved. */
  remindHref: string | null;
  /** tel: link, or null when there is no number. */
  callHref: string | null;
  canMarkPaid: boolean;
};

export type BillingData = {
  planCounts: { plan: string; shops: number }[];
  due: { inDays: number; count: number; overdue: number };
  renewals: RenewalRow[];
  prices: { id: string; plan: string; rupees: string }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "28 Oct" this year, "2 Jan 2027" in another year. India date. */
export function formatPlanDate(d: Date, now: Date): string {
  const india = new Date(d.getTime() + 5.5 * 3600_000);
  const year = india.getUTCFullYear();
  const sameYear = year === new Date(now.getTime() + 5.5 * 3600_000).getUTCFullYear();
  return `${india.getUTCDate()} ${MONTHS[india.getUTCMonth()]}${sameYear ? "" : ` ${year}`}`;
}

/** 49900 -> "499", 49950 -> "499.50". The price field shows rupees. Empty when no price is set. */
export function rupeesFromPaise(paise: number): string {
  if (paise <= 0) return "";
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, "0")}`;
}

/** "1,499" or "1499.5" -> paise. Empty means no price yet (0). Null when it is not a price. */
export function paiseFromRupees(raw: string): number | null {
  const text = raw.replace(/[\s,₹]/g, "");
  if (text === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const rupees = Number(text);
  if (rupees > MAX_PRICE_RUPEES) return null;
  return Math.round(rupees * 100);
}

function formatRupees(paise: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(paise / 100)}`;
}

const ORDER: Record<PaymentState, number> = { overdue: 0, due_soon: 1, paid: 2, not_started: 3 };

function reminderText(shop: BillingShop, plan: PlanRow, state: PaymentState, now: Date): string {
  const hello = `Hi${shop.ownerName ? ` ${shop.ownerName}` : ""},`;
  const price = plan.pricePaise > 0 ? ` The ${plan.name} plan is ${formatRupees(plan.pricePaise)}.` : "";
  if (!shop.planEndsAt) return `${hello} your QR page for ${shop.name} is ready to start.${price}`;
  const date = formatPlanDate(shop.planEndsAt, now);
  if (state === "overdue") {
    return `${hello} the ${plan.name} plan for ${shop.name} ended on ${date}. The page stays live until ${formatPlanDate(graceEnds(shop.planEndsAt), now)}, then shows only the shop name, Call and Directions.${price} Shall we renew it?`;
  }
  return `${hello} the ${plan.name} plan for ${shop.name} ends on ${date}.${price} Shall we renew it?`;
}

export async function getBilling(store: BillingStore, now: Date = new Date()): Promise<BillingData> {
  const [plans, shops] = await Promise.all([store.plans(), store.shops()]);
  const byId = new Map(plans.map((p) => [p.id, p]));

  const planCounts = plans.map((p) => ({ plan: p.name, shops: shops.filter((s) => s.planId === p.id).length }));
  const withPlan = shops.filter((s) => s.planId && byId.has(s.planId) && s.status !== "paused");

  let dueCount = 0;
  let overdue = 0;
  const renewals: RenewalRow[] = [];
  for (const s of withPlan) {
    const plan = byId.get(s.planId ?? "");
    if (!plan) continue;
    const state = paymentState(s.planEndsAt, now);
    if (state === "due_soon") dueCount++;
    if (state === "overdue") overdue++;
    const remind = s.ownerWhatsapp ? whatsappTarget(s.ownerWhatsapp, reminderText(s, plan, state, now)) : null;
    renewals.push({
      shopId: s.id,
      shop: s.name,
      plan: plan.name,
      date: s.planEndsAt ? formatPlanDate(s.planEndsAt, now) : "Not started",
      payment: state,
      remindHref: state === "paid" ? null : remind,
      callHref: telTarget(s.ownerWhatsapp ?? s.phone ?? ""),
      canMarkPaid: true,
    });
  }
  const endsAt = new Map(withPlan.map((s) => [s.id, s.planEndsAt?.getTime() ?? Infinity]));
  renewals.sort(
    (a, b) =>
      ORDER[a.payment] - ORDER[b.payment] ||
      (endsAt.get(a.shopId) ?? Infinity) - (endsAt.get(b.shopId) ?? Infinity) ||
      a.shop.localeCompare(b.shop),
  );

  return {
    planCounts,
    due: { inDays: DUE_WINDOW_DAYS, count: dueCount, overdue },
    renewals,
    prices: plans.map((p) => ({ id: p.id, plan: p.name, rupees: rupeesFromPaise(p.pricePaise) })),
  };
}

/** Mark as paid: renews the shop's plan by one period of its plan. Role checks belong to the caller. */
export async function markPaid(
  store: BillingStore,
  shopId: string,
  userEmail: string,
  now: Date = new Date(),
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const [shop, plans] = await Promise.all([store.find(shopId), store.plans()]);
  if (!shop) return { ok: false, error: "This shop no longer exists." };
  const plan = plans.find((p) => p.id === shop.planId);
  if (!plan) return { ok: false, error: `${shop.name} has no plan yet. Choose one on the shop's QR and plan tab.` };

  const dates = renewalDates({ planStartedAt: shop.planStartedAt, planEndsAt: shop.planEndsAt, months: plan.months, now });
  const status = statusAfterRenewal(shop.status, shop.hasPublished);
  const until = formatPlanDate(dates.planEndsAt, now);
  const price = plan.pricePaise > 0 ? ` (${formatRupees(plan.pricePaise)})` : "";
  await store.renew({
    shopId,
    ...dates,
    status,
    what: `Marked as paid: ${plan.name} plan${price} runs until ${until}${status !== shop.status ? ". Page is fully live again" : ""}`,
    userEmail,
  });
  return { ok: true, message: `${shop.name} is paid up until ${until}.` };
}

/** Saves the plan prices from the form: { planId: "1,499" }. Only changed prices are written. */
export async function savePrices(
  store: BillingStore,
  input: Record<string, unknown>,
  userEmail: string,
): Promise<Decision & { message?: string }> {
  const plans = await store.plans();
  const changes: { id: string; pricePaise: number; line: string }[] = [];
  for (const plan of plans) {
    const raw = input[plan.id];
    if (raw === undefined) continue;
    const paise = typeof raw === "string" ? paiseFromRupees(raw) : null;
    if (paise === null) {
      return { ok: false, error: `The ${plan.name} price is not a number. Use rupees, such as 499 or 1,499.` };
    }
    if (paise !== plan.pricePaise) {
      const was = plan.pricePaise > 0 ? formatRupees(plan.pricePaise) : "not set";
      const now = paise > 0 ? formatRupees(paise) : "not set";
      changes.push({ id: plan.id, pricePaise: paise, line: `${plan.name} ${was} to ${now}` });
    }
  }
  if (changes.length === 0) return { ok: true, message: "No price changed." };
  await store.setPrices({
    prices: changes.map(({ id, pricePaise }) => ({ id, pricePaise })),
    what: `Plan prices changed: ${changes.map((c) => c.line).join(", ")}`,
    userEmail,
  });
  return { ok: true, message: "Prices saved." };
}


