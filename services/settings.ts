// Settings (slice 9): enabled themes and layouts, the suggested look by shop
// type, the traffic filtering switches, and the QR domain and WhatsApp number.
// They live in the settings table, one row per key, and fall back to the
// defaults below. Reads and writes go through a SettingsStore
// (lib/settings-store.ts is the Prisma one). Nothing here is secret: the
// playground and the not-activated page read it without a login.
// No Next.js imports.
import { z } from "zod";
import {
  LAYOUT_IDS,
  THEME_IDS,
  type LayoutId,
  type ThemeId,
} from "../components/shop-page/types.ts";
import { normalizePhone } from "./links.ts";
import { DEFAULT_FILTERS, type FilterSettings } from "./tracking.ts";

export type SettingsStore = {
  get(key: string): Promise<unknown>;
  /** Saves the keys and one change_log row, in one transaction. */
  save(args: { values: Record<string, unknown>; what: string; userEmail: string }): Promise<void>;
};

export type SuggestedLook = { theme: ThemeId; layout: LayoutId };

export type ShopTypeOption = {
  /** Label in the Shop type dropdown. */
  label: string;
  /** Plural noun used in "Suggested for salons". */
  plural: string;
  suggested: SuggestedLook | null;
};

// The shop types are fixed; the suggested look for each is what Settings edits.
// These are the starting suggestions, used until someone changes them.
export const DEFAULT_SHOP_TYPES: ShopTypeOption[] = [
  { label: "Salon and spa", plural: "salons", suggested: { theme: "blush", layout: "list" } },
  { label: "Clinic", plural: "clinics", suggested: { theme: "daylight", layout: "list" } },
  { label: "Gym", plural: "gyms", suggested: { theme: "nightfall", layout: "index" } },
  { label: "Cafe and bakery", plural: "cafes and bakeries", suggested: { theme: "marigold", layout: "tiles" } },
  { label: "Jeweller", plural: "jewellers", suggested: { theme: "graphite", layout: "cover" } },
  { label: "Boutique", plural: "boutiques", suggested: null },
];

export const FILTER_ROWS: { id: keyof FilterSettings; label: string; switchLabel: string }[] = [
  { id: "crawlers", label: "Ignore crawlers, link previews and prefetch", switchLabel: "Ignore crawlers" },
  { id: "token", label: "Count a button tap only if the page was opened first", switchLabel: "Require page token" },
  { id: "dedupe", label: "Count the same device once within 30 seconds", switchLabel: "Dedupe" },
  { id: "rateLimit", label: "Flag a device that sends too many requests a minute", switchLabel: "Rate limit" },
  { id: "spikes", label: "Hold back sudden spikes for review", switchLabel: "Spike review" },
];

export type Domain = { qrBase: string; whatsappSender: string };

export type SettingsData = {
  enabledThemes: Record<ThemeId, boolean>;
  enabledLayouts: Record<LayoutId, boolean>;
  filtering: { id: keyof FilterSettings; label: string; switchLabel: string; enabled: boolean }[];
  shopTypes: ShopTypeOption[];
  domain: Domain;
};

// ---- Reading -------------------------------------------------------------------

function flags<K extends string>(ids: readonly K[], saved: unknown): Record<K, boolean> {
  const obj = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
  return Object.fromEntries(ids.map((id) => [id, typeof obj[id] === "boolean" ? obj[id] : true])) as Record<K, boolean>;
}

const lookSchema = z.object({ theme: z.enum(THEME_IDS), layout: z.enum(LAYOUT_IDS) });

function readShopTypes(saved: unknown): ShopTypeOption[] {
  const obj = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
  return DEFAULT_SHOP_TYPES.map((t) => {
    if (!(t.label in obj)) return t;
    const look = lookSchema.safeParse(obj[t.label]);
    return { ...t, suggested: look.success ? look.data : null };
  });
}

function readDomain(saved: unknown): Domain {
  const obj = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
  return {
    qrBase: typeof obj.qrBase === "string" ? obj.qrBase : "",
    whatsappSender: typeof obj.whatsappSender === "string" ? obj.whatsappSender : "",
  };
}

export async function getSettings(store: SettingsStore): Promise<SettingsData> {
  const [themes, layouts, filtering, shopTypes, domain] = await Promise.all(
    ["themes", "layouts", "filtering", "shop_types", "domain"].map((k) => store.get(k)),
  );
  const filters = { ...DEFAULT_FILTERS, ...flags(Object.keys(DEFAULT_FILTERS) as (keyof FilterSettings)[], filtering) };
  return {
    enabledThemes: flags(THEME_IDS, themes),
    enabledLayouts: flags(LAYOUT_IDS, layouts),
    filtering: FILTER_ROWS.map((f) => ({ ...f, enabled: filters[f.id] })),
    shopTypes: readShopTypes(shopTypes),
    domain: readDomain(domain),
  };
}

// Shop types with their suggested look. The editor and Settings both read it.
export async function getShopTypes(store: SettingsStore): Promise<ShopTypeOption[]> {
  return readShopTypes(await store.get("shop_types"));
}

// ---- Domain ----------------------------------------------------------------------

/**
 * The address printed into QR codes: an https origin with no path, such as
 * https://yourdomain.in. http is accepted only for localhost, to try the files in
 * development. Returns the cleaned value, "" for none, or null when invalid.
 */
export function cleanQrBase(raw: string): string | null {
  const text = raw.trim();
  if (text === "") return "";
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
  if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash || url.username || url.password) return null;
  if (!local && !url.hostname.includes(".")) return null;
  return url.origin;
}

/** The WhatsApp number as digits with the country code ("919820012345"), "" for none, null when invalid. */
export function cleanWhatsapp(raw: string): string | null {
  if (raw.trim() === "") return "";
  return normalizePhone(raw);
}

// ---- Saving ----------------------------------------------------------------------

const boolRecord = <K extends readonly [string, ...string[]]>(ids: K) =>
  z.object(Object.fromEntries(ids.map((id) => [id, z.boolean()])) as Record<K[number], z.ZodBoolean>);

const saveSchema = z.object({
  themes: boolRecord(THEME_IDS),
  layouts: boolRecord(LAYOUT_IDS),
  filtering: boolRecord(Object.keys(DEFAULT_FILTERS) as [keyof FilterSettings, ...(keyof FilterSettings)[]]),
  suggestions: z.record(z.string(), lookSchema.nullable()),
  domain: z.object({ qrBase: z.string().max(200), whatsappSender: z.string().max(40) }).optional(),
});

export type SaveSettingsResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Saves the whole form. `canEditDomain` is true for the owner only: the QR
 * address is printed on every standee, so others cannot change it, and what
 * they send for it is ignored. Role checks belong to the caller.
 */
export async function saveSettings(
  store: SettingsStore,
  input: unknown,
  opts: { canEditDomain: boolean; userEmail: string },
): Promise<SaveSettingsResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the settings and try again." };
  const next = parsed.data;

  if (!THEME_IDS.some((t) => next.themes[t])) return { ok: false, error: "Keep at least one theme turned on." };
  if (!LAYOUT_IDS.some((l) => next.layouts[l])) return { ok: false, error: "Keep at least one layout turned on." };

  const known = new Set(DEFAULT_SHOP_TYPES.map((t) => t.label));
  const suggestions: Record<string, SuggestedLook | null> = {};
  for (const type of DEFAULT_SHOP_TYPES) {
    const look = next.suggestions[type.label] ?? null;
    if (look && (!next.themes[look.theme] || !next.layouts[look.layout])) {
      return { ok: false, error: `The suggested look for ${type.label} uses a theme or layout that is turned off.` };
    }
    suggestions[type.label] = look;
  }
  if (Object.keys(next.suggestions).some((k) => !known.has(k))) return { ok: false, error: "Unknown shop type." };

  const before = await getSettings(store);
  const values: Record<string, unknown> = {
    themes: next.themes,
    layouts: next.layouts,
    filtering: next.filtering,
    shop_types: suggestions,
  };
  const changed: string[] = [];
  if (JSON.stringify(before.enabledThemes) !== JSON.stringify(next.themes)) changed.push("themes");
  if (JSON.stringify(before.enabledLayouts) !== JSON.stringify(next.layouts)) changed.push("layouts");
  if (JSON.stringify(before.shopTypes.map((t) => t.suggested)) !== JSON.stringify(DEFAULT_SHOP_TYPES.map((t) => suggestions[t.label])))
    changed.push("suggested looks");
  if (JSON.stringify(Object.fromEntries(before.filtering.map((f) => [f.id, f.enabled]))) !== JSON.stringify(
    Object.fromEntries(before.filtering.map((f) => [f.id, next.filtering[f.id]])),
  )) changed.push("traffic filtering");

  if (opts.canEditDomain && next.domain) {
    const qrBase = cleanQrBase(next.domain.qrBase);
    if (qrBase === null) {
      return { ok: false, error: "The QR address must start with https:// and have no path, such as https://yourdomain.in." };
    }
    const whatsappSender = cleanWhatsapp(next.domain.whatsappSender);
    if (whatsappSender === null) {
      return { ok: false, error: "That WhatsApp number does not look right. Use a 10 digit number or start with +." };
    }
    values.domain = { qrBase, whatsappSender };
    if (before.domain.qrBase !== qrBase) changed.push("QR address");
    if (before.domain.whatsappSender !== whatsappSender) changed.push("WhatsApp number");
  }

  if (changed.length === 0) return { ok: true, message: "No changes to save." };
  await store.save({ values, what: `Settings changed: ${changed.join(", ")}`, userEmail: opts.userEmail });
  return { ok: true, message: "Settings saved." };
}
