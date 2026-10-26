// Quick setup: turns a few pasted links (a Google share or Maps link, Instagram,
// the website) into suggested shop fields. Google's share pages are rendered by
// script, so the business is found through the Places API (New) by name. No AI
// involved. Suggestions are only shown; the admin applies them in the editor.
// No Next.js imports; relative imports so node --test loads it.
import type { LinkType } from "../components/shop-page/types.ts";
import { LINK_DEFAULTS, normalizePhone, validateTarget } from "./links.ts";
import { newLink, type EditorValues } from "./shop-editor.ts";

export type FetchFn = typeof fetch;

// ---- Pasted input ------------------------------------------------------------

export type ParsedInput = {
  /** share.google, maps.app.goo.gl and google.com/maps links, in the order pasted. */
  googleLinks: string[];
  /** https://instagram.com/<handle>, or null. */
  instagram: string | null;
  website: string | null;
  /** Lines that were not recognised, so the form can say so. */
  unknown: string[];
};

const SOCIAL_HOSTS = /(^|\.)(facebook|fb|youtube|youtu|twitter|x|wa|whatsapp|linkedin|tiktok)\.(com|me|be)$/i;
const INSTAGRAM_RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "tv", "accounts"]);

/** Hosts a pasted link may point at, and that a redirect may land on. */
export function isGoogleHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "share.google" ||
    h === "goo.gl" ||
    h === "maps.app.goo.gl" ||
    /(^|\.)google\.(com|co\.in)$/.test(h)
  );
}

function toUrl(raw: string): URL | null {
  const text = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || !url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

export function classifyInput(text: string): ParsedInput {
  const out: ParsedInput = { googleLinks: [], instagram: null, website: null, unknown: [] };
  for (const piece of text.split(/[\s,]+/)) {
    const raw = piece.trim();
    if (!raw) continue;
    if (/^@[A-Za-z0-9._]{1,30}$/.test(raw)) {
      out.instagram ??= `https://instagram.com/${raw.slice(1)}`;
      continue;
    }
    const url = toUrl(raw);
    if (!url) {
      out.unknown.push(raw);
      continue;
    }
    const host = url.hostname.toLowerCase();
    if (isGoogleHost(host)) {
      // google.com/search or /maps are fine; anything else on Google is not a place link.
      const ok = host === "share.google" || host.endsWith("goo.gl") || /^\/(maps|search|share\.google)/.test(url.pathname);
      if (ok) out.googleLinks.push(url.toString());
      else out.unknown.push(raw);
    } else if (/(^|\.)instagram\.com$/.test(host)) {
      const handle = url.pathname.split("/").find(Boolean);
      if (handle && !INSTAGRAM_RESERVED.has(handle) && /^[A-Za-z0-9._]{1,30}$/.test(handle)) {
        out.instagram ??= `https://instagram.com/${handle}`;
      } else out.unknown.push(raw);
    } else if (SOCIAL_HOSTS.test(host)) {
      out.unknown.push(raw);
    } else {
      // Plain websites are upgraded to https; button targets must be https.
      url.protocol = "https:";
      const target = validateTarget("website", url.toString());
      if (target.ok && target.value) out.website ??= target.value;
      else out.unknown.push(raw);
    }
  }
  return out;
}

// ---- Resolving a Google link ----------------------------------------------------

export type LinkedPlace = { name: string; lat: number | null; lng: number | null };

const MAX_HOPS = 6;
const TIMEOUT_MS = 8000;
// Google serves the redirect chain to a phone browser; keep it that way.
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function nameFromUrl(url: URL): LinkedPlace | null {
  let name = "";
  const place = /^\/maps\/place\/([^/]+)/.exec(url.pathname);
  if (place) name = decodeURIComponent(place[1].replace(/\+/g, " "));
  else name = url.searchParams.get("q") ?? "";
  name = name.trim();
  // A bare share id or a coordinate pair is not a name.
  if (!name || /^https?:/i.test(name) || /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(name)) return null;
  const at = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(url.pathname) ?? /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(url.href);
  return { name: name.slice(0, 120), lat: at ? Number(at[1]) : null, lng: at ? Number(at[2]) : null };
}

/**
 * Follows a Google link's redirects by hand, refusing any hop that leaves
 * Google, and reads the business name from where it lands. Null when it never
 * lands on a page that names one.
 */
export async function resolveGoogleLink(link: string, fetchFn: FetchFn): Promise<LinkedPlace | null> {
  let url = new URL(link);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (url.protocol !== "https:" || !isGoogleHost(url.hostname)) return null;
    const found = nameFromUrl(url);
    // A share.google page redirects again after the first hop; keep going until a name appears.
    if (found && url.hostname !== "share.google" && url.pathname !== "/share.google") return found;
    const res = await fetchFn(url, {
      redirect: "manual",
      headers: { "user-agent": MOBILE_UA, "accept-language": "en-IN,en" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return found;
    url = new URL(location, url);
  }
  return null;
}

// ---- Places API (New) -----------------------------------------------------------

export type PlaceMatch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
};

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
].join(",");

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
};

export function toPlaceMatch(raw: RawPlace): PlaceMatch | null {
  if (!raw.id || !raw.displayName?.text) return null;
  return {
    id: raw.id,
    name: raw.displayName.text,
    address: raw.formattedAddress ?? "",
    phone: raw.nationalPhoneNumber ?? raw.internationalPhoneNumber ?? "",
    website: raw.websiteUri ?? "",
    mapsUrl: raw.googleMapsUri ?? "",
  };
}

export async function searchPlace(
  query: string,
  near: { lat: number; lng: number } | null,
  apiKey: string,
  fetchFn: FetchFn,
): Promise<PlaceMatch | null> {
  const body: Record<string, unknown> = { textQuery: query, regionCode: "IN", languageCode: "en", pageSize: 1 };
  if (near) {
    body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 500 } };
  }
  const res = await fetchFn(PLACES_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey, "x-goog-fieldmask": FIELD_MASK },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Places API answered ${res.status}`);
  const data = (await res.json()) as { places?: RawPlace[] };
  return data.places?.[0] ? toPlaceMatch(data.places[0]) : null;
}

/** The Google review form for a place. One plain link, as the spec requires. */
export function reviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

// ---- WhatsApp message ------------------------------------------------------------

/** Written from the customer's side: they scan the QR, then message the shop. */
export function defaultWaMessage(shopName: string): string {
  return `Hi ${shopName.trim()}! 👋 I scanned your Qlosk code and wanted to get in touch. Could you help me with some details?`;
}

// ---- Suggestions -----------------------------------------------------------------

export type FieldKey = "name" | "address" | "phone" | "whatsapp" | "waMessage" | "maps" | "review" | "website" | "instagram";

export type SuggestedField = { key: FieldKey; label: string; value: string };

export type QuickSetupResult =
  | { ok: true; fields: SuggestedField[]; placeFound: boolean; unknown: string[] }
  | { ok: false; error: string };

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Shop name",
  address: "Full address",
  phone: "Phone number",
  whatsapp: "WhatsApp number",
  waMessage: "WhatsApp message",
  maps: "Directions link",
  review: "Google review link",
  website: "Website",
  instagram: "Instagram",
};

/** Mobile numbers can take WhatsApp; a landline cannot. */
function isMobile(phone: string): boolean {
  const n = normalizePhone(phone);
  return !!n && /^91[6-9]\d{9}$/.test(n);
}

export type QuickSetupDeps = { fetch: FetchFn; apiKey: string | null };

export async function quickSetup(deps: QuickSetupDeps, text: string, currentName: string): Promise<QuickSetupResult> {
  const input = classifyInput(text);
  if (!input.googleLinks.length && !input.instagram && !input.website) {
    return { ok: false, error: "Paste a Google share or Maps link, an Instagram link or a website." };
  }

  let place: PlaceMatch | null = null;
  if (input.googleLinks.length) {
    if (!deps.apiKey) return { ok: false, error: "Add GOOGLE_PLACES_API_KEY to look up Google links." };
    try {
      for (const link of input.googleLinks) {
        const linked = await resolveGoogleLink(link, deps.fetch);
        if (!linked) continue;
        place = await searchPlace(linked.name, linked.lat !== null && linked.lng !== null ? { lat: linked.lat, lng: linked.lng } : null, deps.apiKey, deps.fetch);
        if (place) break;
      }
    } catch (error) {
      console.error("quick setup lookup failed", error);
      return { ok: false, error: "Could not reach Google. Try again, or fill the details by hand." };
    }
  }

  const fields: SuggestedField[] = [];
  const add = (key: FieldKey, value: string) => {
    if (value) fields.push({ key, label: FIELD_LABELS[key], value });
  };
  if (place) {
    add("name", place.name.slice(0, 80));
    add("address", place.address.slice(0, 200));
    add("phone", place.phone);
    if (isMobile(place.phone)) add("whatsapp", place.phone);
    add("maps", place.mapsUrl);
    add("review", reviewUrl(place.id));
  }
  // A website the admin pasted wins over the one Google lists.
  add("website", input.website ?? place?.website ?? "");
  add("instagram", input.instagram ?? "");
  const name = (place?.name ?? currentName).trim();
  if (name) add("waMessage", defaultWaMessage(name));

  return { ok: true, fields, placeFound: place !== null, unknown: input.unknown };
}

// ---- Applying ---------------------------------------------------------------------

const LINK_FOR: Partial<Record<FieldKey, LinkType>> = {
  maps: "maps",
  review: "google_review",
  website: "website",
  instagram: "instagram",
};

function withTarget(links: EditorValues["links"], type: LinkType, target: string): EditorValues["links"] {
  const i = links.findIndex((l) => l.type === type);
  if (i === -1) return [...links, { ...newLink(type), label: LINK_DEFAULTS[type].label, target }];
  return links.map((l, at) => (at === i ? { ...l, target, enabled: true } : l));
}

/** Writes the chosen suggestions into the editor values. Pure; the editor still saves them. */
export function applySuggestions(values: EditorValues, chosen: SuggestedField[]): EditorValues {
  let details = values.details;
  let links = values.links;
  for (const f of chosen) {
    if (f.key === "name") details = { ...details, name: f.value };
    else if (f.key === "address") details = { ...details, address: f.value };
    else if (f.key === "phone") details = { ...details, phone: f.value };
    else if (f.key === "whatsapp") details = { ...details, whatsapp: f.value };
    else {
      const type = LINK_FOR[f.key];
      if (type) links = withTarget(links, type, f.value);
    }
  }
  // The message names the shop, so it is written last, from the name as it now stands.
  if (chosen.some((f) => f.key === "waMessage") && details.name.trim()) {
    details = { ...details, waMessage: defaultWaMessage(details.name) };
  }
  return { ...values, details, links };
}
