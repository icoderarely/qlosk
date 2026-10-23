// Shops list and bulk look change (slice 4a). The list reads through a
// ShopsStore (lib/shops-store.ts is the Prisma one). No Next.js imports (repo rule).
import { z } from "zod";
import {
  FONT_IDS,
  LAYOUT_IDS,
  THEME_IDS,
  type FontId,
  type LayoutId,
  type ThemeId,
} from "../components/shop-page/types.ts";

// ---- Shops list ------------------------------------------------------------
// The list reads through a ShopsStore (implemented with Prisma in
// lib/shops-store.ts), so the rules here run under node --test with a fake.

export const SHOP_PAGE_SIZE = 8;

export const SHOP_TABS = ["all", "live", "preview", "building", "expired"] as const;
export type ShopListTab = (typeof SHOP_TABS)[number];

// The shop_status enum from the spec. "printing" in the design is an
// onboarding stage (slice 8), not a shop status.
export type DbShopStatus =
  | "building"
  | "preview"
  | "live"
  | "quiet"
  | "expired"
  | "paused"
  | "archived";

// Which statuses each tab holds. Quiet shops are still live. All means every
// shop, including paused and archived ones.
export const TAB_STATUSES: Record<ShopListTab, DbShopStatus[] | null> = {
  all: null,
  live: ["live", "quiet"],
  preview: ["preview"],
  building: ["building"],
  expired: ["expired"],
};

export type Look = { theme: ThemeId; layout: LayoutId; font: FontId };

export type ShopFilter = {
  statuses: DbShopStatus[] | null;
  /** Matches name, slug, phone or an assigned QR code. */
  q: string;
  shopType: string;
  theme: ThemeId | "";
  layout: LayoutId | "";
  planName: string;
};

export type ShopRecord = {
  id: string;
  name: string;
  slug: string;
  shopType: string | null;
  status: DbShopStatus;
  code: string | null;
  planName: string | null;
  planMonths: number | null;
  planStartedAt: Date | null;
  planEndsAt: Date | null;
  /** From the draft page. null when the shop has no draft yet. */
  look: Look | null;
  /** Counted scans in the last 30 days. null when there are no daily stats yet. */
  scans: number | null;
};

export type LookChange = {
  shopId: string;
  name: string;
  before: Look | null;
  after: Look;
};

export type ShopsStore = {
  list(filter: ShopFilter, skip: number, take: number): Promise<{ rows: ShopRecord[]; total: number }>;
  countByStatus(): Promise<Partial<Record<DbShopStatus, number>>>;
  shopTypes(): Promise<string[]>;
  planNames(): Promise<string[]>;
  /** Merges the patch into the draft and published page config of each shop
   * and writes one change_log row per shop, all in one transaction. */
  applyLook(args: {
    ids: string[];
    patch: Partial<Look>;
    userEmail: string;
    describe: (change: LookChange) => string;
  }): Promise<LookChange[]>;
};

export type ShopRow = {
  id: string;
  name: string;
  slug: string;
  typeLabel: string;
  status: DbShopStatus;
  look: Look | null;
  code: string | null;
  plan: string;
  planNote: string;
  scans: number | null;
};

export type ShopListQuery = {
  tab: ShopListTab;
  q: string;
  type: string;
  theme: ThemeId | "";
  layout: LayoutId | "";
  plan: string;
  page: number;
};

export type ShopList = {
  shops: ShopRow[];
  tabCounts: Record<ShopListTab, number>;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  types: string[];
  plans: string[];
  query: ShopListQuery;
};

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function oneOf<T extends string>(allowed: readonly T[], v: string): T | "" {
  return (allowed as readonly string[]).includes(v) ? (v as T) : "";
}

// URL search params in, a clean query out. Anything unknown is dropped rather
// than rejected, so an old bookmark still opens the list.
export function parseListQuery(params: Record<string, string | string[] | undefined>): ShopListQuery {
  const page = Number.parseInt(first(params.page), 10);
  return {
    tab: oneOf(SHOP_TABS, first(params.tab)) || "all",
    q: first(params.q).trim().slice(0, 80),
    type: first(params.type).slice(0, 60),
    theme: oneOf(THEME_IDS, first(params.theme)),
    layout: oneOf(LAYOUT_IDS, first(params.layout)),
    plan: first(params.plan).slice(0, 60),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Dates are shown in Indian time whatever the server's time zone is.
function istParts(d: Date): { day: number; month: string; year: number; dayNumber: number } {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return {
    day: ist.getUTCDate(),
    month: MONTHS[ist.getUTCMonth()],
    year: ist.getUTCFullYear(),
    dayNumber: Math.floor(ist.getTime() / 86_400_000),
  };
}

// The second line under the plan name in the list.
export function planNote(
  shop: Pick<ShopRecord, "status" | "planMonths" | "planStartedAt" | "planEndsAt">,
  now: Date,
): string {
  if (!shop.planStartedAt || !shop.planEndsAt) return "Not started";
  const end = istParts(shop.planEndsAt);
  if (shop.status === "expired" || shop.planEndsAt.getTime() < now.getTime()) {
    return `Ended ${end.day} ${end.month}`;
  }
  if ((shop.planMonths ?? 0) >= 60) return `Ends ${end.month} ${end.year}`;
  const days = end.dayNumber - istParts(now).dayNumber;
  if (days <= 0) return "Renews today";
  if (days === 1) return "Renews tomorrow";
  if (days <= 7) return `Renews in ${days} days`;
  return `Renews ${end.day} ${end.month}`;
}

export function filterFromQuery(query: ShopListQuery): ShopFilter {
  return {
    statuses: TAB_STATUSES[query.tab],
    q: query.q,
    shopType: query.type,
    theme: query.theme,
    layout: query.layout,
    planName: query.plan,
  };
}

export async function getShops(
  store: ShopsStore,
  query: ShopListQuery,
  now: Date = new Date(),
): Promise<ShopList> {
  const filter = filterFromQuery(query);
  let page = query.page;
  let result = await store.list(filter, (page - 1) * SHOP_PAGE_SIZE, SHOP_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(result.total / SHOP_PAGE_SIZE));
  if (page > pageCount) {
    // A bookmarked page that no longer exists: show the last one.
    page = pageCount;
    result = await store.list(filter, (page - 1) * SHOP_PAGE_SIZE, SHOP_PAGE_SIZE);
  }

  const [byStatus, types, plans] = await Promise.all([
    store.countByStatus(),
    store.shopTypes(),
    store.planNames(),
  ]);
  const count = (statuses: DbShopStatus[] | null) =>
    (statuses ?? (Object.keys(byStatus) as DbShopStatus[])).reduce(
      (sum, st) => sum + (byStatus[st] ?? 0),
      0,
    );
  const tabCounts = Object.fromEntries(
    SHOP_TABS.map((t) => [t, count(TAB_STATUSES[t])]),
  ) as Record<ShopListTab, number>;

  return {
    shops: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      typeLabel: r.shopType ?? "",
      status: r.status,
      look: r.look,
      code: r.code,
      plan: r.planName ?? "No plan",
      planNote: planNote(r, now),
      scans: r.scans,
    })),
    tabCounts,
    total: result.total,
    page,
    pageCount,
    pageSize: SHOP_PAGE_SIZE,
    types,
    plans,
    query: { ...query, page },
  };
}

// ---- Bulk look change ------------------------------------------------------

export const MAX_BULK_SHOPS = 100;

const bulkLookSchema = z.object({
  ids: z.array(z.uuid()).min(1, "Select at least one shop.").max(MAX_BULK_SHOPS, `Select up to ${MAX_BULK_SHOPS} shops at a time.`),
  theme: z.enum(THEME_IDS).optional(),
  layout: z.enum(LAYOUT_IDS).optional(),
  font: z.enum(FONT_IDS).optional(),
});

export type BulkLookResult = { ok: true; updated: number } | { ok: false; error: string };

function lookText(look: Look | null): string {
  return look ? `${look.theme} · ${look.layout} · ${look.font}` : "no look set";
}

// The text written to change_log for one shop.
export function describeLookChange(change: LookChange): string {
  return `Look changed: ${lookText(change.before)} → ${lookText(change.after)}`;
}

// Role checks belong to the caller (the server action calls requireRole first).
export async function bulkUpdateLook(
  store: ShopsStore,
  input: unknown,
  userEmail: string,
): Promise<BulkLookResult> {
  const parsed = bulkLookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the selection." };
  }
  const { ids, ...rest } = parsed.data;
  const patch: Partial<Look> = {};
  if (rest.theme) patch.theme = rest.theme;
  if (rest.layout) patch.layout = rest.layout;
  if (rest.font) patch.font = rest.font;
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Choose a theme, layout or font to apply." };
  }
  const changes = await store.applyLook({
    ids: Array.from(new Set(ids)),
    patch,
    userEmail,
    describe: describeLookChange,
  });
  return { ok: true, updated: changes.length };
}
