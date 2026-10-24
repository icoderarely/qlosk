// The standee tab's rules (spec section 11): what the saved choices may be, and
// how a shop's editor values become what the three designs draw. The same
// function feeds the live preview (in the browser) and the print files (on the
// server). No Next.js imports.
import { z } from "zod";
import type { Content } from "../components/standee/content.ts";
import {
  DEFAULT_CHOICES,
  STANDEE_DESIGNS,
  STANDEE_MAX_HEADLINE,
  STANDEE_SIZES,
  STANDEE_THEME_CHOICES,
  type StandeeChoices,
  initialsOf,
  resolveHeadline,
  resolveStandeeTheme,
  standeeItems,
} from "../components/standee/types.ts";
import type { StandeeInput } from "./print.ts";
import { resolveLinks } from "./links.ts";
import type { QrArt } from "./qr-art.ts";
import type { EditorValues } from "./shop-editor.ts";

export const choicesSchema = z.object({
  design: z.enum(STANDEE_DESIGNS),
  theme: z.enum(STANDEE_THEME_CHOICES),
  headline: z
    .string()
    .trim()
    .max(STANDEE_MAX_HEADLINE, `Keep the headline under ${STANDEE_MAX_HEADLINE + 1} characters.`),
  size: z.enum(STANDEE_SIZES),
});

export type ChoicesResult = { ok: true; value: StandeeChoices } | { ok: false; error: string };

export function parseChoices(input: unknown): ChoicesResult {
  const r = choicesSchema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: r.error.issues[0]?.message ?? "Check the standee choices." };
}

/** Choices as stored, with anything unknown (an older row, a hand edit) replaced by the default. */
export function normalizeChoices(raw: Partial<Record<keyof StandeeChoices, string>>): StandeeChoices {
  const pick = <T extends string>(list: readonly T[], v: string | undefined, d: T): T => list.find((x) => x === v) ?? d;
  return {
    design: pick(STANDEE_DESIGNS, raw.design, DEFAULT_CHOICES.design),
    theme: pick(STANDEE_THEME_CHOICES, raw.theme, DEFAULT_CHOICES.theme),
    headline: (raw.headline ?? "").trim().slice(0, STANDEE_MAX_HEADLINE),
    size: pick(STANDEE_SIZES, raw.size, DEFAULT_CHOICES.size),
  };
}

/** The shop's enabled buttons that have something to open, as the live page shows them. */
export function standeeButtons(values: EditorValues): { type: EditorValues["links"][number]["type"]; label: string }[] {
  const hasWifi = values.wifi.enabled && values.wifi.network.trim() !== "";
  return resolveLinks(values.links, values.details)
    .links.filter((l) => l.enabled && (l.type === "wifi" ? hasWifi : l.target))
    .map((l) => ({ type: l.type, label: l.label }));
}

/** What the designs draw. `art` is the shop's QR; `logoSrc` a URL or data URI. */
export function standeeContent(values: EditorValues, choices: StandeeChoices, art: QrArt, logoSrc?: string | null): Content {
  const { details, offer } = values;
  const shopName = details.name.trim() || "Your shop name";
  return {
    shopName,
    tagline: details.tagline.trim(),
    headline: resolveHeadline(choices.design, choices.headline),
    initials: initialsOf(shopName),
    logoSrc: logoSrc || null,
    items: standeeItems(standeeButtons(values), offer.enabled && offer.title.trim() !== ""),
    art,
  };
}

/** Everything the print builders need for one shop. */
export function standeeInput(values: EditorValues, choices: StandeeChoices, art: QrArt, logoSrc?: string | null): StandeeInput {
  return {
    design: choices.design,
    theme: resolveStandeeTheme(choices.theme, values.look.theme),
    font: values.look.font,
    size: choices.size,
    content: standeeContent(values, choices, art, logoSrc),
  };
}

// ---- Saving the choices ------------------------------------------------------------------

export type StandeeStore = {
  /** Writes the four columns and one line in the Activity log; false if the shop is gone. */
  saveChoices(shopId: string, choices: StandeeChoices, userEmail: string): Promise<boolean>;
};

export type SaveChoicesResult = { ok: true; choices: StandeeChoices } | { ok: false; error: string };

export async function saveStandeeChoices(
  store: StandeeStore,
  shopId: string,
  input: unknown,
  userEmail: string,
): Promise<SaveChoicesResult> {
  const parsed = parseChoices(input);
  if (!parsed.ok) return parsed;
  if (!(await store.saveChoices(shopId, parsed.value, userEmail))) return { ok: false, error: "Unknown shop." };
  return { ok: true, choices: parsed.value };
}
