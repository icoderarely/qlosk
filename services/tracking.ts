// Scan and tap logging (spec sections 3 and 7). This slice only records what
// happened: every event is stored with is_bot = false. Bot checks, the
// duplicate rule and rate limits arrive in slice 7. Raw IP addresses are never
// stored: ip_hash is a salted hash and the salt changes every day. No cookies.
// No Next.js imports.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
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

export type TrackingStore = {
  findCode(code: string): Promise<ScanCode | null>;
  recordScan(event: { code: string; shopId: string | null; ipHash: string | null; uaFamily: string }): Promise<void>;
  /** The link, only if it belongs to the shop that holds this (assigned) code. */
  findTapLink(code: string, linkId: string): Promise<TapLink | null>;
  recordTap(event: { shopId: string; linkId: string; ipHash: string | null }): Promise<void>;
};

export type ScanOutcome = { kind: "redirect"; slug: string } | { kind: "inactive" };

export type Visitor = { ip: string | null; userAgent: string | null };

function visitorHash(v: Visitor, salt: string | null, now: Date): string | null {
  return v.ip && salt ? hashIp(v.ip, salt, dayKey(now)) : null;
}

// The scan is logged for every well-formed code, assigned or not, so a test scan
// of a code still in stock shows up. A logging failure never stops the redirect.
export async function handleScan(
  store: TrackingStore,
  rawCode: string,
  visitor: Visitor,
  salt: string | null,
  now: Date = new Date(),
): Promise<ScanOutcome> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) return { kind: "inactive" };
  const found = await store.findCode(code);
  if (!found) return { kind: "inactive" };
  try {
    await store.recordScan({
      code,
      shopId: found.status === "assigned" ? found.shopId : null,
      ipHash: visitorHash(visitor, salt, now),
      uaFamily: uaFamily(visitor.userAgent),
    });
  } catch (error) {
    console.error("scan not logged", error);
  }
  return found.liveSlug ? { kind: "redirect", slug: found.liveSlug } : { kind: "inactive" };
}

export type TapOutcome =
  | { kind: "redirect"; target: string }
  | { kind: "notfound" };

// Taps with a good token are logged. A tap without one still reaches its
// destination (a customer should never be stuck) but is not counted; slice 7
// will store those flagged as no_token instead.
export async function handleTap(
  store: TrackingStore,
  rawCode: string,
  linkId: string,
  token: string | null,
  visitor: Visitor,
  keys: { tokenKey: string; salt: string | null },
  now: Date = new Date(),
): Promise<TapOutcome> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code) || !/^[0-9a-f-]{36}$/i.test(linkId)) return { kind: "notfound" };
  const link = await store.findTapLink(code, linkId);
  if (!link || !link.enabled || link.type === "wifi") return { kind: "notfound" };

  // The stored target is checked again, so only https and tel can ever be sent.
  const safe = validateTarget(link.type, link.target);
  if (!safe.ok || !safe.value) return { kind: "notfound" };

  if (verifyTapToken(keys.tokenKey, token, code, linkId, now)) {
    try {
      await store.recordTap({ shopId: link.shopId, linkId: link.linkId, ipHash: visitorHash(visitor, keys.salt, now) });
    } catch (error) {
      console.error("tap not logged", error);
    }
  }
  return { kind: "redirect", target: safe.value };
}

/** The button address the public page uses when the shop has a QR code. */
export function tapHref(code: string, linkId: string, token: string): string {
  return `/r/${code}/${linkId}?t=${encodeURIComponent(token)}`;
}
