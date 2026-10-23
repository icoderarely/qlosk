// Labels for the Look tab, the shops list and Settings. Swatch colours come
// from the theme tokens, so there is one place colour lives.
import { THEMES } from "../shop-page/themes";
import type { FontId, LayoutId, ThemeId } from "../shop-page/types";

export const THEME_OPTIONS: {
  id: ThemeId;
  name: string;
  note: string;
}[] = [
  { id: "daylight", name: "Daylight", note: "Cool white, cobalt" },
  { id: "nightfall", name: "Nightfall", note: "Dark navy, amber" },
  { id: "marigold", name: "Marigold", note: "Warm cream, orange" },
  { id: "blush", name: "Blush", note: "Soft pink, raspberry" },
  { id: "graphite", name: "Graphite", note: "Warm grey, black" },
];

export const LAYOUT_OPTIONS: {
  id: LayoutId;
  name: string;
  note: string;
  /** Wireframe on a 64 x 44 grid: d1 is the highlighted part, d2 the rest. */
  d1: string;
  d2: string;
}[] = [
  { id: "list", name: "List", note: "Stacked rows in one card", d1: "M8 7h48v8H8z", d2: "M8 19h48v5H8z M8 27h48v5H8z M8 35h48v5H8z" },
  { id: "tiles", name: "Tiles", note: "Two-column grid of tiles", d1: "M8 5h48v8H8z", d2: "M8 17h22v10H8z M34 17h22v10H34z M8 31h22v10H8z M34 31h22v10H34z" },
  { id: "cover", name: "Cover", note: "Cover photo, logo on top", d1: "M8 21h48v8H8z", d2: "M0 0h64v14H0z M8 33h48v4H8z M8 39h48v4H8z" },
  { id: "index", name: "Index", note: "Big numbered type list", d1: "M8 12h48v9H8z", d2: "M8 4h26v5H8z M8 26h48v1H8z M8 29h6v3H8z M18 29h38v3H18z M8 35h48v1H8z M8 38h6v3H8z M18 38h38v3H18z" },
  { id: "chat", name: "Chat", note: "Looks like a conversation", d1: "M30 28h26v7H30z", d2: "M8 5h30v8H8z M8 16h24v8H8z M36 38h20v5H36z" },
];

export const FONT_OPTIONS: { id: FontId; name: string; note: string }[] = [
  { id: "editorial", name: "Editorial", note: "Serif headings" },
  { id: "clean", name: "Clean", note: "Modern sans" },
  { id: "rounded", name: "Rounded", note: "Friendly and soft" },
];

export function themeSwatch(id: ThemeId) {
  const t = THEMES[id];
  return { bg: t.bg, btn: t.btn, card: t.card, line: t.line };
}

export function themeName(id: ThemeId): string {
  return THEME_OPTIONS.find((t) => t.id === id)?.name ?? id;
}

export function layoutName(id: LayoutId): string {
  return LAYOUT_OPTIONS.find((l) => l.id === id)?.name ?? id;
}

/** "Blush · List", as shown in the shops list and Settings. */
export function lookLabel(theme: ThemeId, layout: LayoutId): string {
  return `${themeName(theme)} · ${layoutName(layout)}`;
}

// Small palette for the button colour override (design: Small tweaks).
export const BUTTON_COLORS: { hex: string; name: string }[] = [
  { hex: "#9F1D45", name: "Raspberry" },
  { hex: "#1F4FD1", name: "Cobalt" },
  { hex: "#0F6B5C", name: "Teal" },
  { hex: "#B4540A", name: "Orange" },
  { hex: "#16181D", name: "Black" },
];

export const LANGUAGE_OPTIONS = ["English", "Hindi", "Marathi"] as const;
