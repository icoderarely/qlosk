// The playground keeps its look in the URL: ?theme=blush&layout=cover&font=editorial&type=salon
// Pure functions, so they run under node --test.
import {
  FONT_IDS,
  LAYOUT_IDS,
  THEME_IDS,
  type FontId,
  type LayoutId,
  type ThemeId,
} from "../shop-page/types.ts";
import { SHOP_TYPE_IDS, type ShopTypeId } from "./samples.ts";

export const MAX_NAME_LENGTH = 40;
export const MAX_TAGLINE_LENGTH = 80;

export type PlaygroundLook = {
  theme: ThemeId;
  layout: LayoutId;
  font: FontId;
  type: ShopTypeId;
  /** Typed shop name. Empty means "use the sample name". */
  name: string;
  /** Typed tagline. Empty means "use the sample tagline". */
  tagline: string;
};

export const DEFAULT_LOOK: PlaygroundLook = {
  theme: "blush",
  layout: "list",
  font: "clean",
  type: "salon",
  name: "",
  tagline: "",
};

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

// The value if allowed, else the fallback if allowed, else the first allowed one.
function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (allowed.includes(value as T)) return value as T;
  return allowed.includes(fallback) ? fallback : allowed[0];
}

// Anything missing, unknown or disabled falls back: first to the suggested look
// for the shop type, then to the default. `themes` and `layouts` are the ones
// Settings has switched on.
export function parseLook(
  params: Params,
  options: {
    themes?: readonly ThemeId[];
    layouts?: readonly LayoutId[];
    suggest?: (type: ShopTypeId) => { theme: ThemeId; layout: LayoutId } | null;
  } = {},
): PlaygroundLook {
  const themes = options.themes ?? THEME_IDS;
  const layouts = options.layouts ?? LAYOUT_IDS;
  const type = pick(one(params, "type"), SHOP_TYPE_IDS, DEFAULT_LOOK.type);
  const suggested = options.suggest?.(type) ?? null;
  return {
    type,
    theme: pick(one(params, "theme"), themes, suggested?.theme ?? DEFAULT_LOOK.theme),
    layout: pick(one(params, "layout"), layouts, suggested?.layout ?? DEFAULT_LOOK.layout),
    font: pick(one(params, "font"), FONT_IDS, DEFAULT_LOOK.font),
    name: cleanName(one(params, "name") ?? ""),
    tagline: cleanTagline(one(params, "tagline") ?? ""),
  };
}

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trimStart().slice(0, MAX_NAME_LENGTH);
}

export function cleanTagline(raw: string): string {
  return raw.replace(/\s+/g, " ").trimStart().slice(0, MAX_TAGLINE_LENGTH);
}

export function lookToQuery(look: PlaygroundLook): string {
  const q = new URLSearchParams({
    theme: look.theme,
    layout: look.layout,
    font: look.font,
    type: look.type,
  });
  const name = look.name.trim();
  if (name) q.set("name", name);
  const tagline = look.tagline.trim();
  if (tagline) q.set("tagline", tagline);
  return q.toString();
}

export function whatsappLink(
  look: PlaygroundLook,
  labels: { theme: string; layout: string; font: string; type: string },
  number: string,
): string {
  const who = look.name.trim() ? ` My shop is ${look.name.trim()} (${labels.type}).` : ` My shop is a ${labels.type.toLowerCase()}.`;
  const text = `Hi, I would like a page like this for my shop.${who} Look: ${labels.theme} theme, ${labels.layout} layout, ${labels.font} font.`;
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
