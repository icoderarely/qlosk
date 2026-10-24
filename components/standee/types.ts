// What a standee is made of (spec section 11). Plain data, no React, so the
// editor, the services and the tests share it.
import type { FontId, LinkType, ThemeId } from "../shop-page/types.ts";

export const STANDEE_DESIGNS = ["arch", "ticket", "badge"] as const;
export type StandeeDesign = (typeof STANDEE_DESIGNS)[number];

/** Light themes only, so the QR always prints dark on white. */
export const STANDEE_LIGHT_THEMES = ["blush", "marigold", "daylight", "graphite"] as const;
export type StandeeLightTheme = (typeof STANDEE_LIGHT_THEMES)[number];

/** What is saved on the shop: a light theme, or follow the shop page. */
export const STANDEE_THEME_CHOICES = ["match", ...STANDEE_LIGHT_THEMES] as const;
export type StandeeThemeChoice = (typeof STANDEE_THEME_CHOICES)[number];

export const STANDEE_SIZES = ["A5", "A4"] as const;
export type StandeeSize = (typeof STANDEE_SIZES)[number];

export const STANDEE_MAX_HEADLINE = 39; // "under 40 characters"

/** Trim size in millimetres. Same proportions, so one drawing serves both. */
export const SIZE_MM: Record<StandeeSize, { w: number; h: number; label: string }> = {
  A5: { w: 148, h: 210, label: "A5 · 148 × 210 mm" },
  A4: { w: 210, h: 297, label: "A4 · 210 × 297 mm" },
};
export const BLEED_MM = 3;

/** The drawing is laid out 560 units wide, as in docs/design/Standee.dc.html. */
export const CANVAS_W = 560;

export const DESIGN_INFO: Record<StandeeDesign, { name: string; note: string; headline: string }> = {
  arch: { name: "Arch", note: "Rounded panel, QR in the middle", headline: "Everything about us, one scan" },
  ticket: { name: "Ticket", note: "Coupon card with a tear line", headline: "Your shortcut to everything here" },
  badge: { name: "Round badge", note: "QR inside a ring of words", headline: "One scan. Everything here." },
};

export const THEME_LABEL: Record<StandeeThemeChoice, string> = {
  match: "Match shop page",
  blush: "Blush",
  marigold: "Marigold",
  daylight: "Daylight",
  graphite: "Graphite",
};

export const HINT_TEXT = "Point your phone camera at the code. No app needed.";

export type StandeeChoices = {
  design: StandeeDesign;
  theme: StandeeThemeChoice;
  /** Empty means the design's default headline. */
  headline: string;
  size: StandeeSize;
};

export const DEFAULT_CHOICES: StandeeChoices = { design: "arch", theme: "match", headline: "", size: "A5" };

/** The theme the standee prints in: nightfall is dark, so it prints as daylight. */
export function resolveStandeeTheme(choice: StandeeThemeChoice, pageTheme: ThemeId): StandeeLightTheme {
  if (choice !== "match") return choice;
  return pageTheme === "nightfall" ? "daylight" : pageTheme;
}

export function resolveHeadline(design: StandeeDesign, headline: string): string {
  return headline.trim() || DESIGN_INFO[design].headline;
}

/** Page height in drawing units for a size, so both sizes keep their own proportions. */
export function canvasHeight(size: StandeeSize): number {
  const { w, h } = SIZE_MM[size];
  return Math.round(((CANVAS_W * h) / w) * 100) / 100;
}

/** 3 mm of bleed in drawing units. */
export function bleedUnits(size: StandeeSize): number {
  return Math.round(((BLEED_MM * CANVAS_W) / SIZE_MM[size].w) * 100) / 100;
}

// ---- Icons row -----------------------------------------------------------------

/** One thing the code opens: an enabled button, or the offer. */
export type StandeeItem = { type: LinkType | "offer"; short: string; long: string };

// Wording from the design file. `short` sits under an icon (arch); `long` is a
// line of the ticket list.
const ITEM_TEXT: Record<StandeeItem["type"], { short: string; long: string }> = {
  call: { short: "Call", long: "Call us" },
  whatsapp: { short: "WhatsApp", long: "Chat or order on WhatsApp" },
  google_review: { short: "Review us", long: "Review us on Google" },
  wifi: { short: "Free Wi-Fi", long: "Join our Wi-Fi" },
  maps: { short: "Directions", long: "Save our location" },
  instagram: { short: "Instagram", long: "Follow us on Instagram" },
  facebook: { short: "Facebook", long: "Find us on Facebook" },
  youtube: { short: "YouTube", long: "Watch on YouTube" },
  website: { short: "Website", long: "Visit our website" },
  menu: { short: "Menu", long: "See our menu and prices" },
  custom: { short: "More", long: "More information" },
  offer: { short: "Offer", long: "See today's offer" },
};

export const MAX_ITEMS = 5;

export function standeeItems(
  buttons: { type: LinkType; label: string }[],
  hasOffer: boolean,
): StandeeItem[] {
  const items: StandeeItem[] = buttons.map((b) => {
    const t = ITEM_TEXT[b.type];
    // A custom button says what it is; the rest use the design's wording.
    return b.type === "custom" && b.label.trim()
      ? { type: b.type, short: b.label.trim(), long: b.label.trim() }
      : { type: b.type, short: t.short, long: t.long };
  });
  if (hasOffer) items.push({ type: "offer", ...ITEM_TEXT.offer });
  return items.slice(0, MAX_ITEMS);
}

/** First letters of the first two words, as in the design. */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => Array.from(w)[0].toUpperCase());
  return letters.join("") || "S";
}

export type { FontId };
