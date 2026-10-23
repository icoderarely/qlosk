// Overview and Reports (slice 8). Every number comes from daily_stats, never
// from raw events (spec section 7), through a StatsStore (lib/stats-store.ts is
// the Prisma one). Counted numbers leave out flagged events; flagged ones show
// up in the Traffic quality card by reason. No Next.js imports.
import { lastDays } from "./daily-stats.ts";
import { whatsappTarget } from "./links.ts";
import type { OnboardingStage } from "./onboarding.ts";
import type { DbShopStatus } from "./shops.ts";
import { dayKey } from "./tracking.ts";
import type { LinkType } from "../components/shop-page/types.ts";

// ---- Store -------------------------------------------------------------------

/** One daily_stats row. `day` is an India day, YYYY-MM-DD. */
export type StatDay = {
  shopId: string;
  day: string;
  scans: number;
  taps: number;
  botScans: number;
  botTaps: number;
  heldScans: number;
  flagReasons: Record<string, number>;
  tapsByLink: Record<string, number>;
};

export type ShopFacts = {
  id: string;
  name: string;
  status: DbShopStatus;
  stage: OnboardingStage;
  stageChangedAt: Date;
  createdAt: Date;
  code: string | null;
  planName: string | null;
  planEndsAt: Date | null;
  ownerName: string | null;
  ownerWhatsapp: string | null;
};

export type HeldShop = { shopId: string; scans: number; firstDay: string; lastDay: string };

export type StatsStore = {
  /** Rows with `from <= day <= to`, every shop. */
  days(from: string, to: string): Promise<StatDay[]>;
  shops(): Promise<ShopFacts[]>;
  /** Link id -> button type, for naming the buttons in tap counts. */
  linkTypes(): Promise<Record<string, LinkType>>;
  /** Shops that still have scans held for review, over all time. */
  held(): Promise<HeldShop[]>;
};

// ---- Shared helpers ----------------------------------------------------------

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export function parseRange(raw: string | string[] | undefined): Range {
  const n = Number.parseInt((Array.isArray(raw) ? raw[0] : raw) ?? "", 10);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

export type Tone = "up" | "warn" | "mut";
export type Kpi = { label: string; value: string; note: string; tone: Tone };

const DAY_MS = 24 * 3600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2026-10-03" -> "Oct 3". */
export function shortDay(day: string): string {
  return `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
}

function weekdayOf(day: string): string {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}

const BUTTON_LABELS: Record<LinkType, string> = {
  whatsapp: "WhatsApp",
  call: "Call",
  google_review: "Google review",
  wifi: "Wi-Fi password",
  maps: "Directions",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  website: "Website",
  menu: "Services and prices",
  custom: "Other links",
};
const REMOVED_BUTTON = "Removed buttons";

const REASON_LABELS: Record<string, string> = {
  crawler: "Crawlers and link previews",
  no_token: "Tap without a signed page token",
  duplicate: "Repeats within 30 seconds",
  rate_limit: "Too many requests from one visitor",
  spike_review: "Held for review (unusual traffic)",
  marked_bot: "Marked as bots by an admin",
  unknown: "Flagged, reason not recorded",
};

type Totals = { scans: number; taps: number; botScans: number; botTaps: number; held: number };

function sum(rows: StatDay[]): Totals {
  const t: Totals = { scans: 0, taps: 0, botScans: 0, botTaps: 0, held: 0 };
  for (const r of rows) {
    t.scans += r.scans;
    t.taps += r.taps;
    t.botScans += r.botScans;
    t.botTaps += r.botTaps;
    t.held += r.heldScans;
  }
  return t;
}

function inDays(rows: StatDay[], days: Set<string>): StatDay[] {
  return rows.filter((r) => days.has(r.day));
}

function tapRate(scans: number, taps: number): number | null {
  return scans === 0 ? null : Math.round((taps / scans) * 100);
}

/** The "vs previous period" note under a count. */
export function changeNote(current: number, previous: number, days: number): { note: string; tone: Tone } {
  if (current === 0 && previous === 0) return { note: "No counted scans yet", tone: "mut" };
  if (previous === 0) return { note: `Up from none in the previous ${days} days`, tone: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { note: `${pct >= 0 ? "+" : ""}${pct}% vs previous ${days} days`, tone: pct >= 0 ? "up" : "warn" };
}

/** Counted taps by button label, most used first. */
export function buttonCounts(rows: StatDay[], types: Record<string, LinkType>): { label: string; count: number }[] {
  const byLabel = new Map<string, number>();
  for (const r of rows) {
    for (const [linkId, n] of Object.entries(r.tapsByLink)) {
      const type = types[linkId];
      const label = type ? BUTTON_LABELS[type] : REMOVED_BUTTON;
      byLabel.set(label, (byLabel.get(label) ?? 0) + n);
    }
  }
  return [...byLabel].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function waNudge(shop: ShopFacts, text: string, fallback: string): { href: string; external: boolean } {
  const link = shop.ownerWhatsapp ? whatsappTarget(shop.ownerWhatsapp, text) : null;
  return link ? { href: link, external: true } : { href: fallback, external: false };
}

const LIVE_STATUSES: DbShopStatus[] = ["live", "quiet"];
const isLive = (s: ShopFacts) => LIVE_STATUSES.includes(s.status);

function daysAgo(then: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
}

// ---- Overview ----------------------------------------------------------------

export type Attention = { title: string; detail: string; action: string; href: string; external: boolean };

export type RecentShop = {
  id: string;
  name: string;
  code: string | null;
  plan: string;
  /** null when the shop has no daily stats in the window. */
  scans: number | null;
  status: DbShopStatus;
};

export type OverviewData = {
  range: Range;
  kpis: Kpi[];
  /** Counted scans per day, oldest first. */
  scansSeries: { value: number }[];
  scansAxis: { index: number; text: string }[];
  buttons: { label: string; percent: number }[];
  attention: Attention[];
  recentShops: RecentShop[];
};

/** Four evenly spread points to label under a chart of `count` days. */
export function axisIndexes(count: number): number[] {
  if (count <= 1) return [0];
  const last = count - 1;
  return [...new Set([0, Math.round(last / 3), Math.round((2 * last) / 3), last])];
}

export async function getOverview(store: StatsStore, range: Range = 30, now: Date = new Date()): Promise<OverviewData> {
  const current = lastDays(now, range);
  const previous = lastDays(new Date(now.getTime() - range * DAY_MS), range);
  const today = current[current.length - 1];
  const [rows, shops, types, held] = await Promise.all([
    store.days(previous[0], today),
    store.shops(),
    store.linkTypes(),
    store.held(),
  ]);
  const cur = inDays(rows, new Set(current));
  const prev = inDays(rows, new Set(previous));
  const c = sum(cur);
  const change = changeNote(c.scans, sum(prev).scans, range);

  const monthStart = `${today.slice(0, 7)}-01`;
  const liveShops = shops.filter(isLive);
  const addedThisMonth = liveShops.filter((s) => dayKey(s.createdAt) >= monthStart).length;
  const rate = tapRate(c.scans, c.taps);
  const dueEnd = new Date(now.getTime() + 14 * DAY_MS);
  const renewals = shops.filter(
    (s) => s.status !== "archived" && s.status !== "paused" && s.planEndsAt && s.planEndsAt >= now && s.planEndsAt <= dueEnd,
  ).length;

  const kpis: Kpi[] = [
    {
      label: "Live shops",
      value: String(liveShops.length),
      note: addedThisMonth > 0 ? `${addedThisMonth} added this month` : "None added this month",
      tone: addedThisMonth > 0 ? "up" : "mut",
    },
    { label: "Scans", value: String(c.scans), note: change.note, tone: change.tone },
    {
      label: "Button taps",
      value: String(c.taps),
      note: rate === null ? "No scans to compare yet" : `${rate}% of scans tapped a button`,
      tone: "mut",
    },
    { label: "Renewals due", value: String(renewals), note: "In the next 14 days", tone: renewals > 0 ? "warn" : "mut" },
  ];

  const perDay = new Map<string, number>();
  for (const r of cur) perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.scans);

  const counts = buttonCounts(cur, types);
  const tapTotal = counts.reduce((n, b) => n + b.count, 0);
  const buttons = counts.slice(0, 5).map((b) => ({ label: b.label, percent: Math.round((b.count / tapTotal) * 100) }));

  const scansByShop = new Map<string, number>();
  for (const r of cur) scansByShop.set(r.shopId, (scansByShop.get(r.shopId) ?? 0) + r.scans);
  const recentShops = shops
    .filter((s) => s.status !== "archived")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      plan: s.planName ?? "No plan",
      scans: scansByShop.has(s.id) ? (scansByShop.get(s.id) ?? 0) : null,
      status: s.status,
    }));

  return {
    range,
    kpis,
    scansSeries: current.map((d) => ({ value: perDay.get(d) ?? 0 })),
    scansAxis: axisIndexes(current.length).map((index) => ({ index, text: shortDay(current[index]) })),
    buttons,
    attention: attentionItems(shops, held, rows, current.slice(-7), now),
    recentShops,
  };
}

const MAX_ATTENTION = 6;

function attentionItems(shops: ShopFacts[], held: HeldShop[], rows: StatDay[], lastWeek: string[], now: Date): Attention[] {
  const byId = new Map(shops.map((s) => [s.id, s]));
  const items: Attention[] = [];
  const open = (id: string) => `/admin/shops/${id}`;

  for (const h of held) {
    const shop = byId.get(h.shopId);
    if (!shop) continue;
    items.push({
      title: "Unusual traffic to review",
      detail: `${shop.name} · ${h.scans} scans held out of reports`,
      action: "Review",
      href: "/admin/reports",
      external: false,
    });
  }

  for (const s of shops) {
    if (s.stage !== "preview_sent" || s.status === "archived") continue;
    const days = daysAgo(s.stageChangedAt, now);
    if (days < 2) continue;
    const link = waNudge(s, `Hi, did you get a chance to look at the preview of your page for ${s.name}?`, open(s.id));
    items.push({
      title: "Preview waiting for approval",
      detail: `${s.name} · sent ${days} days ago`,
      action: link.external ? "Nudge" : "Open",
      ...link,
    });
  }

  for (const s of shops) {
    if (s.status === "archived" || s.status === "paused" || !s.planEndsAt) continue;
    const days = Math.ceil((s.planEndsAt.getTime() - now.getTime()) / DAY_MS);
    if (days > 7 || days < -15) continue;
    const when = days < 0 ? `ended ${-days} days ago` : days === 0 ? "ends today" : `ends in ${days} days`;
    const link = waNudge(s, `Hi, the plan for ${s.name} ${when}. Shall we renew it?`, open(s.id));
    items.push({
      title: days < 0 ? "Plan has ended" : `Plan ${when}`,
      detail: `${s.name} · ${s.planName ?? "No plan"}`,
      action: link.external ? "Remind" : "Open",
      ...link,
    });
  }

  for (const s of shops) {
    if (s.stage !== "printing" || s.status === "archived") continue;
    items.push({
      title: "Standee in progress",
      detail: `${s.name} · ${s.code ? `code ${s.code}` : "no QR code assigned yet"}`,
      action: "Open board",
      href: "/admin/onboarding",
      external: false,
    });
  }

  const week = new Set(lastWeek);
  const scansThisWeek = new Map<string, number>();
  for (const r of rows) if (week.has(r.day)) scansThisWeek.set(r.shopId, (scansThisWeek.get(r.shopId) ?? 0) + r.scans);
  for (const s of shops) {
    if (!isLive(s) || daysAgo(s.createdAt, now) < 7 || (scansThisWeek.get(s.id) ?? 0) > 0) continue;
    items.push({
      title: "No scans in 7 days",
      detail: `${s.name} · ${s.code ? "check the standee" : "no QR code assigned"}`,
      action: "Open",
      href: open(s.id),
      external: false,
    });
  }

  return items.slice(0, MAX_ATTENTION);
}

// ---- Reports -----------------------------------------------------------------

export type ReportShopFlag = "clean" | "spike" | "quiet";

export type ReportShopRow = {
  shopId: string;
  name: string;
  scans: number;
  taps: number;
  /** null when the shop has no scans. */
  tapRate: number | null;
  topButton: string | null;
  filtered: number;
  flag: ReportShopFlag;
  flagLabel: string;
};

export type Unusual = { shopId: string; shop: string; detail: string };

export type MonthlyEntry = {
  shopId: string;
  name: string;
  ownerName: string | null;
  scans: number;
  taps: number;
  text: string;
  /** A wa.me link with the text filled in, or null when no owner number is saved. */
  whatsappHref: string | null;
};

export type MonthlyReport = {
  monthLabel: string;
  ready: MonthlyEntry[];
  /** Shops with unreviewed unusual traffic, left out until an admin decides. */
  heldOut: { shopId: string; name: string }[];
  preview: MonthlyEntry | null;
};

export type ReportsData = {
  range: Range;
  kpis: Kpi[];
  byShop: ReportShopRow[];
  traffic: { counted: number; filtered: number; reasons: { label: string; count: number }[] };
  unusual: Unusual[];
  monthly: MonthlyReport;
};

function unusualDetail(h: HeldShop): string {
  const when = h.firstDay === h.lastDay ? `on ${shortDay(h.firstDay)}` : `between ${shortDay(h.firstDay)} and ${shortDay(h.lastDay)}`;
  return `${h.scans} scans arrived in a burst ${when}, far above this shop's normal rate. They are held out of the numbers and the monthly report until you decide.`;
}

export async function getReports(
  store: StatsStore,
  range: Range = 30,
  now: Date = new Date(),
  previewShopId: string | null = null,
): Promise<ReportsData> {
  const current = lastDays(now, range);
  const previous = lastDays(new Date(now.getTime() - range * DAY_MS), range);
  const today = current[current.length - 1];
  const [rows, shops, types, held] = await Promise.all([
    store.days(previous[0], today),
    store.shops(),
    store.linkTypes(),
    store.held(),
  ]);
  const curDays = new Set(current);
  const cur = inDays(rows, curDays);
  const c = sum(cur);
  const change = changeNote(c.scans, sum(inDays(rows, new Set(previous))).scans, range);
  const filtered = c.botScans + c.botTaps;
  const requests = c.scans + c.taps + filtered;
  const rate = tapRate(c.scans, c.taps);

  const perWeekday = new Map<string, number>();
  for (const r of cur) perWeekday.set(weekdayOf(r.day), (perWeekday.get(weekdayOf(r.day)) ?? 0) + r.scans);
  const busiest = [...perWeekday].sort((a, b) => b[1] - a[1])[0];

  const kpis: Kpi[] = [
    { label: "Counted scans", value: String(c.scans), note: change.note, tone: change.tone },
    {
      label: "Button taps",
      value: String(c.taps),
      note: rate === null ? "No scans to compare yet" : `${rate}% tap rate`,
      tone: "mut",
    },
    {
      label: "Filtered traffic",
      value: String(filtered),
      note: requests === 0 ? "No traffic yet" : `${Math.round((filtered / requests) * 100)}% of all requests`,
      tone: filtered > 0 ? "warn" : "mut",
    },
    {
      label: "Busiest day",
      value: busiest && busiest[1] > 0 ? busiest[0] : "None yet",
      note: "Across all shops",
      tone: "mut",
    },
  ];

  const heldIds = new Set(held.map((h) => h.shopId));
  const lastWeek = new Set(current.slice(-7));
  const byShop: ReportShopRow[] = [];
  for (const s of shops) {
    if (s.status === "archived") continue;
    const mine = cur.filter((r) => r.shopId === s.id);
    const t = sum(mine);
    const active = mine.length > 0 || isLive(s) || heldIds.has(s.id);
    if (!active) continue;
    const week = sum(inDays(rows.filter((r) => r.shopId === s.id), lastWeek));
    let flag: ReportShopFlag = "clean";
    let flagLabel = "Clean";
    if (heldIds.has(s.id)) {
      flag = "spike";
      flagLabel = "Spike to review";
    } else if (isLive(s) && week.scans === 0 && daysAgo(s.createdAt, now) >= 7) {
      flag = "quiet";
      flagLabel = "Quiet, 7 days";
    }
    byShop.push({
      shopId: s.id,
      name: s.name,
      scans: t.scans,
      taps: t.taps,
      tapRate: tapRate(t.scans, t.taps),
      topButton: buttonCounts(mine, types)[0]?.label ?? null,
      filtered: t.botScans + t.botTaps,
      flag,
      flagLabel,
    });
  }
  byShop.sort((a, b) => b.scans - a.scans || a.name.localeCompare(b.name));

  const reasons = new Map<string, number>();
  for (const r of cur) for (const [why, n] of Object.entries(r.flagReasons)) reasons.set(why, (reasons.get(why) ?? 0) + n);

  const names = new Map(shops.map((s) => [s.id, s.name]));
  const unusual = held.flatMap((h) =>
    names.has(h.shopId) ? [{ shopId: h.shopId, shop: names.get(h.shopId) ?? "", detail: unusualDetail(h) }] : [],
  );

  return {
    range,
    kpis,
    byShop,
    traffic: {
      counted: c.scans + c.taps,
      filtered,
      reasons: [...reasons]
        .map(([why, count]) => ({ label: REASON_LABELS[why] ?? REASON_LABELS.unknown, count }))
        .sort((a, b) => b.count - a.count),
    },
    unusual,
    monthly: await monthlyReport(store, now, previewShopId, { shops, types, held }),
  };
}

// ---- Monthly owner report ----------------------------------------------------

/** First and last India day of the calendar month before the one `now` falls in. */
export function previousMonth(now: Date): { first: string; last: string; label: string } {
  const today = dayKey(now);
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7)) - 1;
  if (month === 0) {
    year -= 1;
    month = 12;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    first: `${year}-${pad(month)}-01`,
    last: `${year}-${pad(month)}-${pad(lastDay)}`,
    label: `${LONG_MONTHS[month - 1]} ${year}`,
  };
}

export function reportText(args: {
  shop: string;
  owner: string | null;
  monthLabel: string;
  scans: number;
  taps: number;
  topButton: string | null;
  busiestDay: string | null;
}): string {
  const hello = `Hi${args.owner ? ` ${args.owner}` : ""}, here is the ${args.monthLabel} report for ${args.shop}.`;
  if (args.scans === 0) {
    return `${hello}\n\nNo scans were counted this month. If the standee is not where customers can see it, tell us and we will help move it.`;
  }
  const lines = [
    `${args.scans} ${args.scans === 1 ? "person" : "people"} scanned your QR code and ${args.taps} tapped a button.`,
  ];
  if (args.topButton && args.taps > 0) lines.push(`The most used button was ${args.topButton}.`);
  if (args.busiestDay) lines.push(`Your busiest day was ${args.busiestDay}.`);
  return `${hello}\n\n${lines.join(" ")}`;
}

type Loaded = { shops: ShopFacts[]; types: Record<string, LinkType>; held: HeldShop[] };

export async function monthlyReport(
  store: StatsStore,
  now: Date,
  previewShopId: string | null,
  loaded?: Loaded,
): Promise<MonthlyReport> {
  const month = previousMonth(now);
  const [rows, { shops, types, held }] = await Promise.all([
    store.days(month.first, month.last),
    loaded ??
      Promise.all([store.shops(), store.linkTypes(), store.held()]).then(([shops, types, held]) => ({ shops, types, held })),
  ]);
  const heldIds = new Set(held.map((h) => h.shopId));
  const ready: MonthlyEntry[] = [];
  const heldOut: { shopId: string; name: string }[] = [];

  for (const s of shops.filter(isLive).sort((a, b) => a.name.localeCompare(b.name))) {
    if (heldIds.has(s.id)) {
      heldOut.push({ shopId: s.id, name: s.name });
      continue;
    }
    const mine = rows.filter((r) => r.shopId === s.id);
    const t = sum(mine);
    const perWeekday = new Map<string, number>();
    for (const r of mine) perWeekday.set(weekdayOf(r.day), (perWeekday.get(weekdayOf(r.day)) ?? 0) + r.scans);
    const busiest = [...perWeekday].sort((a, b) => b[1] - a[1])[0];
    const text = reportText({
      shop: s.name,
      owner: s.ownerName,
      monthLabel: month.label,
      scans: t.scans,
      taps: t.taps,
      topButton: buttonCounts(mine, types)[0]?.label ?? null,
      busiestDay: busiest && busiest[1] > 0 ? busiest[0] : null,
    });
    ready.push({
      shopId: s.id,
      name: s.name,
      ownerName: s.ownerName,
      scans: t.scans,
      taps: t.taps,
      text,
      whatsappHref: s.ownerWhatsapp ? whatsappTarget(s.ownerWhatsapp, text) : null,
    });
  }

  return {
    monthLabel: month.label,
    ready,
    heldOut,
    preview: ready.find((e) => e.shopId === previewShopId) ?? null,
  };
}

// ---- CSV ---------------------------------------------------------------------

// A cell that starts with = + - @ would run as a formula in a spreadsheet, so it
// gets a leading apostrophe. Shop names are typed by hand, so this matters.
export function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function reportsCsv(data: ReportsData): string {
  const head = ["Shop", "Counted scans", "Button taps", "Tap rate %", "Top button", "Filtered requests", "Flag"];
  const lines = data.byShop.map((r) =>
    [r.name, r.scans, r.taps, r.tapRate, r.topButton, r.filtered, r.flagLabel].map(csvCell).join(","),
  );
  return [head.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
