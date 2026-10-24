// Scan and tap logging with bot filtering (spec sections 3 and 7). Every request
// is stored; bots are flagged with a reason and kept, never deleted. Raw IP
// addresses are never stored: ip_hash is a salted hash and the salt changes every
// day. No cookies. No Next.js imports.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isbot } from "isbot";
import { isValidCode, normalizeCode } from "./qr.ts";
import { validateTarget } from "./links.ts";
import type { LinkType } from "../components/shop-page/types.ts";

/** Same visitor, same day -> same hash; a new day -> a different one. */
export function hashIp(ip: string, salt: string, day: string): string {
  return createHash("sha256").update(`${salt}|${day}|${ip}`).digest("hex").slice(0, 32);
}

/** The day in India, which is when the salt rolls over. */
export function dayKey(now: Date): string {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/** First address in X-Forwarded-For, or null. Only ever fed to hashIp. */
export function clientIp(forwardedFor: string | null): string | null {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first ? first : null;
}

/** A coarse browser family. The full user agent string is not kept. */
export function uaFamily(ua: string | null): string {
  if (!ua) return "unknown";
  if (/WhatsApp/i.test(ua)) return "whatsapp";
  if (/Instagram|FBAN|FBAV/i.test(ua)) return "social-app";
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Chrome\/|CriOS/.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

// ---- Tap tokens --------------------------------------------------------------

// A button tap goes through /r/<code>/<linkId>?t=<token>. The token is made when
// the shop page renders, so a tap can be tied to a page that was really opened.
export const TAP_TOKEN_TTL_SECONDS = 6 * 3600;

function tapSignature(key: string, code: string, linkId: string, exp: string): string {
  return createHmac("sha256", key).update(`${code}:${linkId}:${exp}`).digest("base64url");
}

export function signTapToken(key: string, code: string, linkId: string, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000 + TAP_TOKEN_TTL_SECONDS).toString(36);
  return `${exp}.${tapSignature(key, code, linkId, exp)}`;
}

export function verifyTapToken(key: string, token: string | null, code: string, linkId: string, now: Date): boolean {
  if (!token) return false;
  const [exp, sig, extra] = token.split(".");
  if (!exp || !sig || extra !== undefined) return false;
  const expires = Number.parseInt(exp, 36);
  if (!Number.isFinite(expires) || expires * 1000 < now.getTime()) return false;
  const expected = Buffer.from(tapSignature(key, code, linkId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ---- Store -------------------------------------------------------------------

export type ScanCode = {
  status: "unassigned" | "assigned" | "retired";
  shopId: string | null;
  /** Set when the code is assigned and its shop has a live published page. */
  liveSlug: string | null;
};

export type TapLink = {
  shopId: string;
  linkId: string;
  type: LinkType;
  target: string;
  enabled: boolean;
};

export type BotReason = "crawler" | "no_token" | "duplicate" | "rate_limit" | "spike_review";
export type Flag = { isBot: false; botReason: null } | { isBot: true; botReason: BotReason };

/** Settings switches for the checks (spec section 7). All on unless turned off. */
export type FilterSettings = {
  crawlers: boolean;
  token: boolean;
  dedupe: boolean;
  rateLimit: boolean;
  spikes: boolean;
};
export const DEFAULT_FILTERS: FilterSettings = { crawlers: true, token: true, dedupe: true, rateLimit: true, spikes: true };

export const DUPLICATE_WINDOW_SECONDS = 30;
export const RATE_LIMIT_PER_MINUTE = 30;
export const SPIKE_MIN_SCANS_PER_HOUR = 50;
export const SPIKE_FACTOR = 10;

export type ScanEventInput = { code: string; shopId: string | null; ipHash: string | null; uaFamily: string } & Flag;
export type TapEventInput = { shopId: string; linkId: string; ipHash: string | null } & Flag;

export type TrackingStore = {
  findCode(code: string): Promise<ScanCode | null>;
  recordScan(event: ScanEventInput): Promise<void>;
  /** The link, only if it belongs to the shop that holds this (assigned) code. */
  findTapLink(code: string, linkId: string): Promise<TapLink | null>;
  recordTap(event: TapEventInput): Promise<void>;
  /** The switches from Settings; missing ones are on. */
  filterSettings(): Promise<FilterSettings>;
  /** Scans and taps from this visitor hash since `since`, flagged or not. */
  countRecent(ipHash: string, since: Date): Promise<number>;
  /** Was there already a counted (not flagged) event from this hash on this target since `since`? */
  hasCountedRecent(kind: "scan" | "tap", ipHash: string, target: string, since: Date): Promise<boolean>;
  /** Scans for the shop in the last hour (counted or held), and counted scans in the 7 days before that. */
  spikeStats(shopId: string, now: Date): Promise<{ lastHour: number; weekBefore: number }>;
  /** Flags the shop's counted scans since `since` as spike_review. */
  holdScans(shopId: string, since: Date): Promise<void>;
};

export type ScanOutcome = { kind: "redirect"; slug: string } | { kind: "inactive" };

/** `skipLog`: a HEAD or prefetch request, answered but never stored. */
export type Visitor = { ip: string | null; userAgent: string | null; skipLog?: boolean };

// ---- Checks ------------------------------------------------------------------

// Link-preview fetchers that isbot may not know, or that we want named outright.
const PREVIEW_AGENTS = /WhatsApp\/|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterestbot|Applebot|Google-InspectionTool|Bytespider/i;

/** Crawlers and link previews. A missing user agent counts: browsers always send one. */
export function isCrawler(userAgent: string | null): boolean {
  if (!userAgent || !userAgent.trim()) return true;
  return isbot(userAgent) || PREVIEW_AGENTS.test(userAgent);
}

/** HEAD requests and browser prefetches are not visits (spec section 7). */
export function isIgnoredRequest(method: string, headers: { get(name: string): string | null }): boolean {
  if (method.toUpperCase() === "HEAD") return true;
  const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""} ${headers.get("x-purpose") ?? ""}`;
  return (
    /prefetch|prerender/i.test(purpose) ||
    headers.get("x-moz") === "prefetch" ||
    headers.get("next-router-prefetch") !== null ||
    headers.get("x-middleware-prefetch") !== null
  );
}

/** Whether this hourly count is far above the shop's normal rate. */
export function isSpike(lastHour: number, weekBefore: number): boolean {
  const normalPerHour = weekBefore / (7 * 24);
  return lastHour > Math.max(SPIKE_MIN_SCANS_PER_HOUR, normalPerHour * SPIKE_FACTOR);
}

const OK: Flag = { isBot: false, botReason: null };
const flag = (botReason: BotReason): Flag => ({ isBot: true, botReason });

// Shared by scans and taps. Cheapest checks first, and the first that fires is
// the reason stored. Checks that need a visitor hash are skipped without one.
async function rateAndRepeat(
  store: TrackingStore,
  filters: FilterSettings,
  kind: "scan" | "tap",
  target: string,
  ipHash: string | null,
  now: Date,
): Promise<Flag> {
  if (!ipHash) return OK;
  if (filters.rateLimit) {
    // Earlier requests only (this one is not stored yet), so reaching the limit means this one is over it.
    const recent = await store.countRecent(ipHash, new Date(now.getTime() - 60_000));
    if (recent >= RATE_LIMIT_PER_MINUTE) return flag("rate_limit");
  }
  if (filters.dedupe) {
    const since = new Date(now.getTime() - DUPLICATE_WINDOW_SECONDS * 1000);
    if (await store.hasCountedRecent(kind, ipHash, target, since)) return flag("duplicate");
  }
  return OK;
}

function visitorHash(v: Visitor, salt: string | null, now: Date): string | null {
  return v.ip && salt ? hashIp(v.ip, salt, dayKey(now)) : null;
}

async function flagScan(
  store: TrackingStore,
  code: string,
  shopId: string | null,
  ipHash: string | null,
  userAgent: string | null,
  now: Date,
): Promise<Flag> {
  const filters = await store.filterSettings();
  if (filters.crawlers && isCrawler(userAgent)) return flag("crawler");
  const verdict = await rateAndRepeat(store, filters, "scan", code, ipHash, now);
  if (verdict.isBot) return verdict;
  if (filters.spikes && shopId) {
    const { lastHour, weekBefore } = await store.spikeStats(shopId, now);
    // lastHour does not include this scan yet.
    if (isSpike(lastHour + 1, weekBefore)) {
      await store.holdScans(shopId, new Date(now.getTime() - 3600_000));
      return flag("spike_review");
    }
  }
  return OK;
}

// The scan is logged for every well-formed code, assigned or not, so a test scan
// of a code still in stock shows up. A logging failure never stops the redirect.
export async function handleScan(
  store: TrackingStore,
  rawCode: string,
  visitor: Visitor,
  salt: string | null,
  now: Date = new Date(),
  defer?: Defer,
): Promise<ScanOutcome> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) return { kind: "inactive" };
  const found = await store.findCode(code);
  if (!found) return { kind: "inactive" };
  if (!visitor.skipLog) {
    const log = async () => {
      try {
        const ipHash = visitorHash(visitor, salt, now);
        const shopId = found.status === "assigned" ? found.shopId : null;
        const verdict = await flagScan(store, code, shopId, ipHash, visitor.userAgent, now);
        await store.recordScan({ code, shopId, ipHash, uaFamily: uaFamily(visitor.userAgent), ...verdict });
      } catch (error) {
        console.error("scan not logged", error);
      }
    };
    // With `defer` the visitor is redirected first and the checks and the write finish afterwards.
    if (defer) defer(log);
    else await log();
  }
  return found.liveSlug ? { kind: "redirect", slug: found.liveSlug } : { kind: "inactive" };
}

/** Runs work after the response is sent (Next's `after`); the service stays free of Next imports. */
export type Defer = (work: () => Promise<void>) => void;

export type TapOutcome =
  | { kind: "redirect"; target: string }
  | { kind: "notfound" };

// Every tap is logged. A tap without a good token still reaches its destination
// (a customer should never be stuck) but is stored flagged no_token.
export async function handleTap(
  store: TrackingStore,
  rawCode: string,
  linkId: string,
  token: string | null,
  visitor: Visitor,
  keys: { tokenKey: string; salt: string | null },
  now: Date = new Date(),
  defer?: Defer,
): Promise<TapOutcome> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code) || !/^[0-9a-f-]{36}$/i.test(linkId)) return { kind: "notfound" };
  const link = await store.findTapLink(code, linkId);
  if (!link || !link.enabled || link.type === "wifi") return { kind: "notfound" };

  // The stored target is checked again, so only https and tel can ever be sent.
  const safe = validateTarget(link.type, link.target);
  if (!safe.ok || !safe.value) return { kind: "notfound" };

  if (!visitor.skipLog) {
    const log = async () => {
      try {
        const ipHash = visitorHash(visitor, keys.salt, now);
        const filters = await store.filterSettings();
        let verdict: Flag = OK;
        if (filters.crawlers && isCrawler(visitor.userAgent)) verdict = flag("crawler");
        else if (filters.token && !verifyTapToken(keys.tokenKey, token, code, linkId, now)) verdict = flag("no_token");
        else verdict = await rateAndRepeat(store, filters, "tap", link.linkId, ipHash, now);
        await store.recordTap({ shopId: link.shopId, linkId: link.linkId, ipHash, ...verdict });
      } catch (error) {
        console.error("tap not logged", error);
      }
    };
    if (defer) defer(log);
    else await log();
  }
  return { kind: "redirect", target: safe.value };
}

/** The button address the public page uses when the shop has a QR code. */
export function tapHref(code: string, linkId: string, token: string): string {
  return `/r/${code}/${linkId}?t=${encodeURIComponent(token)}`;
}
