// The shop editor: draft and publish (spec sections 4 and 9). Edits are saved
// to the draft page row; Publish copies the draft to the published row and
// updates the shop's own columns and its link rows. Reads and writes go
// through an EditorStore (lib/shop-editor-store.ts is the Prisma one), so the
// rules here run under node --test with a fake. No Next.js imports.
import { z } from "zod";
import {
  FONT_IDS,
  LAYOUT_IDS,
  THEME_IDS,
  type FontId,
  type LayoutId,
  type LinkType,
  type ThemeId,
} from "../components/shop-page/types.ts";
import {
  LINK_DEFAULTS,
  LINK_TYPES,
  resolveLinks,
  type LinkDraft,
} from "./links.ts";
import { checkButtonColor, contrastReason } from "./look.ts";
import { checkSlug, freeSlug, slugify } from "./slug.ts";
import type { DbShopStatus } from "./shops.ts";

export const LANGUAGES = ["English", "Hindi", "Marathi"] as const;
export type Language = (typeof LANGUAGES)[number];

export type EditorDetails = {
  name: string;
  tagline: string;
  shopType: string;
  areaCity: string;
  address: string;
  phone: string;
  whatsapp: string;
  waMessage: string;
  logoUrl: string;
  coverUrl: string;
  // Internal only. Saved to the shop row at once, never published.
  ownerName: string;
  ownerWhatsapp: string;
  notes: string;
};

export type EditorOffer = { enabled: boolean; title: string; code: string; note: string; validUntil: string };
export type EditorBanner = { enabled: boolean; message: string; period: string };
export type EditorWifi = { enabled: boolean; network: string; password: string };

/** Everything the editor lets you type or pick. */
export type EditorValues = {
  details: EditorDetails;
  slug: string;
  links: LinkDraft[];
  look: { theme: ThemeId; layout: LayoutId; font: FontId };
  /** Hex of the button colour override, or null for the theme default. */
  buttonColor: string | null;
  language: Language;
  offer: EditorOffer;
  banner: EditorBanner;
  wifi: EditorWifi;
};

const INTERNAL_KEYS = ["ownerName", "ownerWhatsapp", "notes"] as const;

const text = (max: number) => z.string().max(max, `Keep it under ${max} characters.`);
const imageUrl = z
  .string()
  .max(500)
  .refine((v) => v === "" || v.startsWith("https://") || v.startsWith("/uploads/"), "Bad image address.");

const valuesSchema = z.object({
  details: z.object({
    name: text(80),
    tagline: text(120),
    shopType: text(60),
    areaCity: text(120),
    address: text(200),
    phone: text(30),
    whatsapp: text(30),
    waMessage: text(300),
    logoUrl: imageUrl,
    coverUrl: imageUrl,
    ownerName: text(80),
    ownerWhatsapp: text(30),
    notes: text(4000),
  }),
  slug: text(60),
  links: z
    .array(
      z.object({
        id: z.uuid(),
        type: z.enum(LINK_TYPES as [LinkType, ...LinkType[]]),
        label: z.string().trim().min(1, "Every button needs a name.").max(40, "Button names can be up to 40 characters."),
        target: text(500),
        enabled: z.boolean(),
      }),
    )
    .max(20, "A page can have up to 20 buttons."),
  look: z.object({
    theme: z.enum(THEME_IDS),
    layout: z.enum(LAYOUT_IDS),
    font: z.enum(FONT_IDS),
  }),
  buttonColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  language: z.enum(LANGUAGES),
  offer: z.object({ enabled: z.boolean(), title: text(80), code: text(30), note: text(200), validUntil: text(40) }),
  banner: z.object({ enabled: z.boolean(), message: text(120), period: text(40) }),
  wifi: z.object({ enabled: z.boolean(), network: text(60), password: text(63) }),
});

// ---- Defaults ----------------------------------------------------------------

const EMPTY_DETAILS: EditorDetails = {
  name: "", tagline: "", shopType: "Salon and spa", areaCity: "", address: "", phone: "",
  whatsapp: "", waMessage: "", logoUrl: "", coverUrl: "", ownerName: "", ownerWhatsapp: "", notes: "",
};

// The buttons a new shop starts with, as in the design. Targets stay empty
// until the phone numbers and links are filled in.
const STARTER: { type: LinkType; enabled: boolean }[] = [
  { type: "whatsapp", enabled: true },
  { type: "call", enabled: true },
  { type: "google_review", enabled: true },
  { type: "wifi", enabled: true },
  { type: "maps", enabled: true },
  { type: "instagram", enabled: true },
  { type: "menu", enabled: false },
];

export function newLink(type: LinkType, enabled = true): LinkDraft {
  return { id: globalThis.crypto.randomUUID(), type, label: LINK_DEFAULTS[type].label, target: "", enabled };
}

export function newShopValues(): EditorValues {
  return {
    details: { ...EMPTY_DETAILS },
    slug: "",
    links: STARTER.map((s) => newLink(s.type, s.enabled)),
    look: { theme: "daylight", layout: "list", font: "clean" },
    buttonColor: null,
    language: "English",
    offer: { enabled: false, title: "", code: "", note: "", validUntil: "" },
    banner: { enabled: false, message: "", period: "" },
    wifi: { enabled: false, network: "", password: "" },
  };
}

// ---- Stored shape ------------------------------------------------------------

export type StoredShop = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  shopType: string | null;
  area: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  waMessage: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  status: DbShopStatus;
  ownerName: string | null;
  ownerWhatsapp: string | null;
  notes: string | null;
  code: string | null;
  planName: string | null;
  planMonths: number | null;
  planStartedAt: Date | null;
  planEndsAt: Date | null;
  /** Page config JSON of the draft and published rows (null when no row). */
  draft: unknown;
  published: unknown;
  publishedAt: Date | null;
};

export type ShopColumns = {
  name: string;
  tagline: string | null;
  shopType: string | null;
  area: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  waMessage: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};

export type InternalFields = { ownerName: string | null; ownerWhatsapp: string | null; notes: string | null };

export type EditorStore = {
  find(id: string): Promise<StoredShop | null>;
  /** False when another shop uses the slug now or used it before. */
  slugAvailable(slug: string, exceptShopId: string | null): Promise<boolean>;
  changes(id: string, take: number): Promise<{ what: string; userEmail: string; at: Date }[]>;
  traffic(id: string): Promise<{ scans: number | null; taps: number | null; bots: number | null; lastScan: Date | null }>;
  create(args: {
    slug: string;
    columns: ShopColumns;
    internal: InternalFields;
    config: unknown;
    userEmail: string;
  }): Promise<string>;
  saveDraft(args: {
    id: string;
    slugChange: { from: string; to: string } | null;
    internal: InternalFields;
    config: unknown;
    userEmail: string;
    logs: string[];
  }): Promise<void>;
  publish(args: {
    id: string;
    config: unknown;
    columns: ShopColumns;
    links: LinkDraft[];
    userEmail: string;
  }): Promise<void>;
};

// ---- Config <-> values -------------------------------------------------------

type Config = Record<string, unknown>;

function toColumns(d: EditorDetails): ShopColumns {
  const comma = d.areaCity.lastIndexOf(",");
  const area = comma === -1 ? d.areaCity.trim() : d.areaCity.slice(0, comma).trim();
  const city = comma === -1 ? "" : d.areaCity.slice(comma + 1).trim();
  const orNull = (v: string) => (v.trim() ? v.trim() : null);
  return {
    name: d.name.trim(),
    tagline: orNull(d.tagline),
    shopType: orNull(d.shopType),
    area: orNull(area),
    city: orNull(city),
    address: orNull(d.address),
    phone: orNull(d.phone),
    whatsapp: orNull(d.whatsapp),
    waMessage: orNull(d.waMessage),
    logoUrl: orNull(d.logoUrl),
    coverUrl: orNull(d.coverUrl),
  };
}

function toInternal(d: EditorDetails): InternalFields {
  const orNull = (v: string) => (v.trim() ? v.trim() : null);
  return { ownerName: orNull(d.ownerName), ownerWhatsapp: orNull(d.ownerWhatsapp), notes: orNull(d.notes) };
}

// The JSON stored in shop_pages.config. theme, layout and font stay at the top
// level because the shops list and its bulk change read them there.
export function toConfig(v: EditorValues, links: LinkDraft[]): Config {
  const publicDetails: Record<string, string> = { ...v.details };
  for (const k of INTERNAL_KEYS) delete publicDetails[k];
  return {
    ...v.look,
    buttonColor: v.buttonColor,
    language: v.language,
    offer: v.offer,
    banner: v.banner,
    wifi: v.wifi,
    details: publicDetails,
    links,
  };
}

// Reads a stored page back into editor values. Seeded or older rows may hold
// only theme, layout and font, so every part falls back to the shop's own
// columns or a default instead of failing.
export function readValues(shop: StoredShop): EditorValues {
  const base = newShopValues();
  const cfg: Config =
    shop.draft && typeof shop.draft === "object" && !Array.isArray(shop.draft) ? (shop.draft as Config) : {};
  const fromCfg = (cfg.details && typeof cfg.details === "object" ? cfg.details : {}) as Record<string, unknown>;
  const areaCity = [shop.area, shop.city].filter(Boolean).join(", ");
  const draftHasDetails = typeof cfg.details === "object" && cfg.details !== null;
  const field = (key: string, fallback: string) =>
    draftHasDetails && typeof fromCfg[key] === "string" ? (fromCfg[key] as string) : fallback;

  const pick = <T,>(schema: z.ZodType<T>, value: unknown, fallback: T): T => {
    const r = schema.safeParse(value);
    return r.success ? r.data : fallback;
  };
  const shape = valuesSchema.shape;
  const links = Array.isArray(cfg.links)
    ? cfg.links.flatMap((l) => {
        const r = shape.links.element.safeParse(l);
        return r.success ? [r.data] : [];
      })
    : base.links;

  return {
    details: {
      // Once a draft has been saved its details are the whole truth, so a field
      // cleared in the draft stays cleared. Before that, use the shop's columns.
      name: draftHasDetails ? field("name", shop.name) : shop.name,
      tagline: field("tagline", shop.tagline ?? ""),
      shopType: field("shopType", shop.shopType ?? base.details.shopType),
      areaCity: field("areaCity", areaCity),
      address: field("address", shop.address ?? ""),
      phone: field("phone", shop.phone ?? ""),
      whatsapp: field("whatsapp", shop.whatsapp ?? ""),
      waMessage: field("waMessage", shop.waMessage ?? ""),
      logoUrl: field("logoUrl", shop.logoUrl ?? ""),
      coverUrl: field("coverUrl", shop.coverUrl ?? ""),
      ownerName: shop.ownerName ?? "",
      ownerWhatsapp: shop.ownerWhatsapp ?? "",
      notes: shop.notes ?? "",
    },
    slug: shop.slug,
    links,
    look: {
      theme: pick(shape.look.shape.theme, cfg.theme, base.look.theme),
      layout: pick(shape.look.shape.layout, cfg.layout, base.look.layout),
      font: pick(shape.look.shape.font, cfg.font, base.look.font),
    },
    buttonColor: pick(shape.buttonColor, cfg.buttonColor ?? null, null),
    language: pick(shape.language, cfg.language, base.language),
    offer: pick(shape.offer, cfg.offer, base.offer),
    banner: pick(shape.banner, cfg.banner, base.banner),
    wifi: pick(shape.wifi, cfg.wifi, base.wifi),
  };
}

// Same data, same string, whatever order the keys came back in from Postgres.
export function stable(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, val]) => [k, sort(val)]),
      );
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

export function hasUnpublishedChanges(draft: unknown, published: unknown): boolean {
  if (draft == null) return false;
  return published == null || stable(draft) !== stable(published);
}

// ---- Reading -----------------------------------------------------------------

export type ChangeRow = { what: string; who: string; when: string };
export type Traffic = { scans: number | null; taps: number | null; bots: number | null; lastScan: string };

export type ShopEditorData = {
  /** null for a shop that has not been created yet. */
  id: string | null;
  status: DbShopStatus;
  code: string | null;
  plan: { name: string; renewsOn: string; started: string } | null;
  values: EditorValues;
  published: boolean;
  hasUnpublished: boolean;
  changes: ChangeRow[];
  traffic: Traffic;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ist(d: Date) {
  return new Date(d.getTime() + 5.5 * 3600_000);
}
export function formatDay(d: Date): string {
  const x = ist(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}
export function formatWhen(d: Date): string {
  const x = ist(d);
  const h = x.getUTCHours();
  const m = String(x.getUTCMinutes()).padStart(2, "0");
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}, ${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}`;
}

export function newShopData(): ShopEditorData {
  return {
    id: null,
    status: "building",
    code: null,
    plan: null,
    values: newShopValues(),
    published: false,
    hasUnpublished: false,
    changes: [],
    traffic: { scans: null, taps: null, bots: null, lastScan: "Never" },
  };
}

export async function getShopEditor(store: EditorStore, id: string): Promise<ShopEditorData | null> {
  const shop = await store.find(id);
  if (!shop) return null;
  const [changes, traffic] = await Promise.all([store.changes(id, 20), store.traffic(id)]);
  return {
    id: shop.id,
    status: shop.status,
    code: shop.code,
    plan: shop.planName
      ? {
          name: shop.planName,
          renewsOn: shop.planEndsAt ? formatDay(shop.planEndsAt) : "Not started",
          started: shop.planStartedAt ? formatDay(shop.planStartedAt) : "Not started",
        }
      : null,
    values: readValues(shop),
    published: shop.published != null,
    hasUnpublished: hasUnpublishedChanges(shop.draft, shop.published),
    changes: changes.map((c) => ({ what: c.what, who: c.userEmail, when: formatWhen(c.at) })),
    traffic: {
      scans: traffic.scans,
      taps: traffic.taps,
      bots: traffic.bots,
      lastScan: traffic.lastScan ? formatDay(traffic.lastScan) : "Never",
    },
  };
}

// ---- Writing -----------------------------------------------------------------

export type SaveResult =
  | {
      ok: true;
      id: string;
      slug: string;
      /** Button targets after cleanup (a typed @handle becomes a full link). */
      links: LinkDraft[];
      hasUnpublished: boolean;
      published: boolean;
      message: string;
    }
  | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

type Prepared = {
  values: EditorValues;
  slug: string;
  links: LinkDraft[];
  missing: string[];
  config: Config;
};

async function prepare(
  store: EditorStore,
  existing: StoredShop | null,
  input: unknown,
): Promise<Prepared | { ok: false; error: string }> {
  const parsed = valuesSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const values = parsed.data as EditorValues;
  if (!values.details.name.trim()) return fail("Enter the shop name.");

  if (values.buttonColor) {
    const check = checkButtonColor(values.look.theme, values.buttonColor);
    if (!check.ok) return fail(`That button color cannot be used: the ${contrastReason(check)}.`);
  }

  let slug = values.slug.trim().toLowerCase();
  if (!slug && existing) slug = existing.slug;
  if (!slug) {
    slug = await freeSlug(slugify(values.details.name), async (s) => !(await store.slugAvailable(s, null)));
  } else if (!existing || slug !== existing.slug) {
    const problem = checkSlug(slug);
    if (problem) return fail(problem);
    if (!(await store.slugAvailable(slug, existing?.id ?? null))) {
      return fail("That address is already used by another shop, or was before. Choose another.");
    }
  }

  const resolved = resolveLinks(values.links, values.details);
  if (resolved.errors.length > 0) return fail(resolved.errors[0]);

  return {
    values: { ...values, slug, links: resolved.links },
    slug,
    links: resolved.links,
    missing: resolved.missing,
    config: toConfig(values, resolved.links),
  };
}

// Which parts of the editor changed, for the change log.
function changedSections(before: EditorValues, after: EditorValues): string[] {
  const out: string[] = [];
  const pubBefore = toConfig(before, before.links);
  const pubAfter = toConfig(after, after.links);
  if (stable(pubBefore.details) !== stable(pubAfter.details)) out.push("details");
  if (stable(before.links) !== stable(after.links)) out.push("buttons");
  if (stable(before.look) !== stable(after.look) || before.buttonColor !== after.buttonColor || before.language !== after.language) {
    out.push("look");
  }
  if (stable([before.offer, before.banner, before.wifi]) !== stable([after.offer, after.banner, after.wifi])) {
    out.push("offers and Wi-Fi");
  }
  if (stable(toInternal(before.details)) !== stable(toInternal(after.details))) out.push("owner and notes");
  return out;
}

async function writeDraft(
  store: EditorStore,
  existing: StoredShop | null,
  p: Prepared,
  userEmail: string,
): Promise<{ id: string; changed: boolean }> {
  const internal = toInternal(p.values.details);
  if (!existing) {
    const id = await store.create({
      slug: p.slug,
      columns: toColumns(p.values.details),
      internal,
      config: p.config,
      userEmail,
    });
    return { id, changed: true };
  }

  const before = readValues(existing);
  const sections = changedSections(before, p.values);
  const slugChange = p.slug !== existing.slug ? { from: existing.slug, to: p.slug } : null;
  const logs: string[] = [];
  if (sections.length > 0) logs.push(`Draft saved: ${sections.join(", ")}`);
  if (slugChange) logs.push(`Page address changed from ${slugChange.from} to ${slugChange.to}`);
  if (logs.length === 0 && existing.draft != null) return { id: existing.id, changed: false };

  await store.saveDraft({ id: existing.id, slugChange, internal, config: p.config, userEmail, logs });
  return { id: existing.id, changed: true };
}

async function load(store: EditorStore, id: string | null): Promise<StoredShop | null | "missing"> {
  if (id === null) return null;
  return (await store.find(id)) ?? "missing";
}

// Role checks belong to the caller (the server actions call requireRole first).
export async function saveDraft(
  store: EditorStore,
  id: string | null,
  input: unknown,
  userEmail: string,
): Promise<SaveResult> {
  const existing = await load(store, id);
  if (existing === "missing") return fail("This shop no longer exists.");
  const p = await prepare(store, existing, input);
  if ("ok" in p) return p;
  const written = await writeDraft(store, existing, p, userEmail);
  const after = await store.find(written.id);
  return {
    ok: true,
    id: written.id,
    slug: p.slug,
    links: p.links,
    hasUnpublished: hasUnpublishedChanges(after?.draft, after?.published),
    published: after?.published != null,
    message: written.changed ? "Draft saved." : "No changes to save.",
  };
}

export async function publishShop(
  store: EditorStore,
  id: string | null,
  input: unknown,
  userEmail: string,
): Promise<SaveResult> {
  const existing = await load(store, id);
  if (existing === "missing") return fail("This shop no longer exists.");
  const p = await prepare(store, existing, input);
  if ("ok" in p) return p;
  if (p.missing.length > 0) {
    return fail(`Cannot publish yet. ${p.missing.slice(0, 3).join(" ")}`);
  }
  const written = await writeDraft(store, existing, p, userEmail);
  await store.publish({
    id: written.id,
    config: p.config,
    columns: toColumns(p.values.details),
    links: p.links,
    userEmail,
  });
  return {
    ok: true,
    id: written.id,
    slug: p.slug,
    links: p.links,
    hasUnpublished: false,
    published: true,
    message: "Published. Customers now see these changes.",
  };
}

export { LINK_DEFAULTS };
