// What /s/[slug] shows (spec sections 3 and 4): the published page of a shop,
// a redirect from an old address, or nothing. Reads go through a PublicStore
// (lib/public-page-store.ts is the Prisma one). No Next.js imports.
import type { ShopPageProps } from "../components/shop-page/types.ts";
import { LINK_DEFAULTS } from "./links.ts";
import { checkButtonColor } from "./look.ts";
import { isReduced } from "./plans.ts";
import { tapHref } from "./tracking.ts";
import { readValues, type StoredShop } from "./shop-editor.ts";
import { checkSlug } from "./slug.ts";

export type PublicStore = {
  findBySlug(slug: string): Promise<StoredShop | null>;
  /** True when a shop with this slug has a published page and is not hidden. */
  isLive(slug: string): Promise<boolean>;
  /** The current slug of the shop that used `oldSlug` before, if any. */
  currentSlugForOld(oldSlug: string): Promise<string | null>;
};

export type PublicLookup =
  | { kind: "page"; props: ShopPageProps; code: string | null; title: string; description: string }
  | { kind: "redirect"; slug: string }
  | { kind: "notfound" };

// Shops that are paused or archived are taken off the public site.
const HIDDEN: StoredShop["status"][] = ["paused", "archived"];

export function isPublic(shop: StoredShop): boolean {
  return shop.published != null && !HIDDEN.includes(shop.status);
}

// Only the published config is used, and only fields meant for customers: the
// owner's name, number and notes never reach this object.
export function toPageProps(shop: StoredShop): ShopPageProps {
  const v = readValues({ ...shop, draft: shop.published });
  const d = v.details;
  const wifi =
    v.wifi.enabled && v.wifi.network.trim() ? { network: v.wifi.network, password: v.wifi.password } : null;
  const color = v.buttonColor && checkButtonColor(v.look.theme, v.buttonColor).ok ? v.buttonColor : null;
  return {
    ...v.look,
    buttonColor: color,
    shop: {
      name: d.name,
      tagline: d.tagline || null,
      area: d.areaCity || null,
      logoUrl: d.logoUrl || null,
      coverUrl: d.coverUrl || null,
    },
    // A button with nothing to open is left off the page. Wi-Fi has no outside
    // link; the page shows its details in place.
    links: v.links
      .filter((l) => l.enabled && (l.type === "wifi" ? wifi !== null : l.target))
      .map((l) => ({
        id: l.id,
        type: l.type,
        label: l.label,
        shortLabel: LINK_DEFAULTS[l.type].shortLabel,
        hint: LINK_DEFAULTS[l.type].hint,
        href: l.type === "wifi" ? "#" : l.target,
      })),
    offer:
      v.offer.enabled && v.offer.title.trim()
        ? { title: v.offer.title, note: v.offer.note || undefined, code: v.offer.code || undefined }
        : null,
    wifi,
    banner: v.banner.enabled && v.banner.message.trim() ? { text: v.banner.message } : null,
  };
}

/**
 * A shop whose plan ended more than 15 days ago (spec section 4): only the shop
 * name, a Call button and Directions. The look is kept; the logo, cover,
 * tagline, offer, Wi-Fi and banner are not shown.
 */
export function reducedProps(props: ShopPageProps): ShopPageProps {
  return {
    ...props,
    shop: { name: props.shop.name, tagline: null, area: null, logoUrl: null, coverUrl: null },
    links: props.links.filter((l) => l.type === "call" || l.type === "maps"),
    offer: null,
    wifi: null,
    banner: null,
  };
}

/**
 * When the shop has a QR code, its buttons go through /r/<code>/<linkId> with a
 * token, so a tap can be counted. Without a code they link straight to the
 * target. Wi-Fi never links out.
 */
export function withTapLinks(
  props: ShopPageProps,
  code: string | null,
  sign: (code: string, linkId: string) => string,
): ShopPageProps {
  if (!code) return props;
  return {
    ...props,
    links: props.links.map((l) => (l.type === "wifi" ? l : { ...l, href: tapHref(code, l.id, sign(code, l.id)) })),
  };
}

/** Old address -> the shop's current one, or null when `slug` is not an old address. */
export async function redirectFor(store: PublicStore, slug: string): Promise<string | null> {
  if (checkSlug(slug) !== null) return null;
  const current = await store.currentSlugForOld(slug);
  return current && current !== slug ? current : null;
}

export async function lookupPublicPage(store: PublicStore, rawSlug: string): Promise<PublicLookup> {
  const slug = rawSlug.toLowerCase();
  // Anything that could not be a slug never reaches the database.
  if (checkSlug(slug) !== null) return { kind: "notfound" };

  const shop = await store.findBySlug(slug);
  if (shop) {
    if (!isPublic(shop)) return { kind: "notfound" };
    // Read after the data, so the time is request time.
    const full = toPageProps(shop);
    const props = isReduced(shop, new Date()) ? reducedProps(full) : full;
    return {
      kind: "page",
      props,
      code: shop.code,
      title: props.shop.name,
      description: props.shop.tagline ?? `${props.shop.name} on one page: call, WhatsApp, directions and more.`,
    };
  }

  const current = await redirectFor(store, slug);
  return current ? { kind: "redirect", slug: current } : { kind: "notfound" };
}

export type Route = { kind: "page" } | { kind: "redirect"; slug: string } | { kind: "notfound" };

// The cheap version of lookupPublicPage, for the proxy: it only decides the
// HTTP answer (200, 301 or 404) without loading the whole page.
export async function routeFor(store: PublicStore, rawSlug: string): Promise<Route> {
  const slug = rawSlug.toLowerCase();
  if (checkSlug(slug) !== null) return { kind: "notfound" };
  if (await store.isLive(slug)) return { kind: "page" };
  const current = await redirectFor(store, slug);
  return current ? { kind: "redirect", slug: current } : { kind: "notfound" };
}
