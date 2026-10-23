export const THEME_IDS = [
  "daylight",
  "nightfall",
  "marigold",
  "blush",
  "graphite",
] as const;
export const LAYOUT_IDS = ["list", "tiles", "cover", "index", "chat"] as const;
export const FONT_IDS = ["editorial", "clean", "rounded"] as const;

export type ThemeId = (typeof THEME_IDS)[number];
export type LayoutId = (typeof LAYOUT_IDS)[number];
export type FontId = (typeof FONT_IDS)[number];

// Mirrors the link_type enum in prisma/schema.prisma.
export type LinkType =
  | "whatsapp"
  | "call"
  | "google_review"
  | "wifi"
  | "maps"
  | "instagram"
  | "facebook"
  | "youtube"
  | "website"
  | "menu"
  | "custom";

export type ShopInfo = {
  name: string;
  tagline?: string | null;
  area?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
};

export type ShopLink = {
  id: string;
  type: LinkType;
  /** Full label, used by list, cover, index and chat. */
  label: string;
  /** Shorter label for tiles. Falls back to `label`. */
  shortLabel?: string;
  /** Second line under the label in tiles and on the primary button. */
  hint?: string;
  /** https:, tel: or a same-site path such as /r/<code>/<linkId>. */
  href: string;
};

export type Offer = {
  title: string;
  note?: string;
  code?: string;
};

export type WifiInfo = {
  network: string;
  password: string;
};

export type Banner = {
  text: string;
};

export type ShopPageProps = {
  theme: ThemeId;
  layout: LayoutId;
  font: FontId;
  shop: ShopInfo;
  links: ShopLink[];
  offer?: Offer | null;
  wifi?: WifiInfo | null;
  banner?: Banner | null;
};

/** What every layout component receives (ShopPage prepares it). */
export type ShopLayoutProps = {
  shop: ShopInfo;
  primary: ShopLink | null;
  rest: ShopLink[];
  offer: Offer | null;
  wifi: WifiInfo | null;
};
