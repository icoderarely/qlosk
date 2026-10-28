// What a shop link shows when it is pasted into a chat app: the text of the
// preview and the content of its 1200 x 630 card. Only the published page props
// go in, so a draft can never reach the card. No Next.js imports; relative
// imports only so node --test loads it.
import type { FontId, LinkType, ShopPageProps, ThemeId } from "../components/shop-page/types.ts";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
/** Chat apps crop the sides of the card; everything stays inside x 160 to 1040. */
export const SAFE_LEFT = 160;
export const SAFE_RIGHT = 1040;

export type CardPill = { type: LinkType; label: string };

export type ShareCardModel = {
  theme: ThemeId;
  font: FontId;
  buttonColor: string | null;
  name: string;
  /** Font size in px, by name length. */
  nameSize: number;
  initials: string;
  tagline: string | null;
  area: string | null;
  logoUrl: string | null;
  pills: CardPill[];
  /** True when the shop has enabled buttons that are not among the pills. */
  more: boolean;
};

// The four buttons a pill is drawn for, in this order.
const PILLS: { type: LinkType; label: string }[] = [
  { type: "call", label: "Call" },
  { type: "whatsapp", label: "WhatsApp" },
  { type: "google_review", label: "Reviews" },
  { type: "maps", label: "Maps" },
];

const clip = (text: string, max: number) => {
  const chars = Array.from(text.trim());
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
};

/** 84 px up to 14 characters, 68 px up to 22, 54 px beyond. */
export function nameSizeFor(name: string): number {
  const length = Array.from(name.trim()).length;
  return length <= 14 ? 84 : length <= 22 ? 68 : 54;
}

/** One or two capital letters for the circle shown when a shop has no logo. */
export function initialsFor(name: string): string {
  const words = name.split(/[\s&]+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  const letters = words.slice(0, 2).map((w) => Array.from(w.replace(/^[^\p{L}\p{N}]+/u, ""))[0] ?? "");
  return letters.join("").toUpperCase() || "Q";
}

/** The card for a shop. Links come from the published page, so turned-off buttons are already gone. */
export function shareCardModel(props: ShopPageProps): ShareCardModel {
  const enabled = new Set(props.links.map((l) => l.type));
  const pills = PILLS.filter((p) => enabled.has(p.type));
  const shown = new Set(pills.map((p) => p.type));
  const name = clip(props.shop.name, 40);
  return {
    theme: props.theme,
    font: props.font,
    buttonColor: props.buttonColor ?? null,
    name,
    nameSize: nameSizeFor(name),
    initials: initialsFor(name),
    tagline: props.shop.tagline ? clip(props.shop.tagline, 72) : null,
    area: props.shop.area ? clip(props.shop.area, 36) : null,
    logoUrl: props.shop.logoUrl ?? null,
    pills,
    more: props.links.some((l) => !shown.has(l.type)),
  };
}

const NAMES: Partial<Record<LinkType, string>> = {
  call: "Call",
  whatsapp: "WhatsApp",
  google_review: "reviews",
  maps: "directions",
};

/** "Call, WhatsApp, reviews and directions", leaving out any button the shop has turned off. */
export function actionsSentence(props: ShopPageProps): string {
  const types = new Set(props.links.map((l) => l.type));
  const words = (["call", "whatsapp", "google_review", "maps"] as const).filter((t) => types.has(t)).map((t) => NAMES[t]!);
  if (words.length === 0) return "";
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  return `${list}.`;
}

/** "<tagline>. Call, WhatsApp, reviews and directions." The shop name stands in when there is no tagline. */
export function shareDescription(props: ShopPageProps): string {
  const tagline = props.shop.tagline?.trim().replace(/[.!?\s]+$/, "") ?? "";
  const actions = actionsSentence(props);
  const lead = tagline ? `${tagline}.` : `${props.shop.name.trim()} on one page.`;
  return actions ? `${lead} ${actions.charAt(0).toUpperCase()}${actions.slice(1)}` : lead;
}

/** The ?v= value: the publish time in epoch seconds, so every publish gets a fresh image address. */
export function shareImageVersion(publishedAt: Date | null): number {
  return publishedAt ? Math.floor(publishedAt.getTime() / 1000) : 0;
}

export function shareImagePath(slug: string, publishedAt: Date | null): string {
  return `/qr/s/${slug}/og?v=${shareImageVersion(publishedAt)}`;
}

/** The fields generateMetadata sets for a live shop. `origin` has no trailing slash. */
export function shareMeta(args: { slug: string; props: ShopPageProps; publishedAt: Date | null; origin: string }) {
  const name = args.props.shop.name;
  const description = shareDescription(args.props);
  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      siteName: "Qlosk",
      type: "website" as const,
      url: `${args.origin}/s/${args.slug}`,
      images: [{ url: shareImagePath(args.slug, args.publishedAt), width: CARD_WIDTH, height: CARD_HEIGHT, alt: name }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: name,
      description,
      images: [shareImagePath(args.slug, args.publishedAt)],
    },
  };
}
