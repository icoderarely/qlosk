// Onboarding board (slice 8). A shop's stage says where we are in the work;
// its status says what the public sees, and stays separate. The board reads
// and moves stages through an OnboardingStore (lib/onboarding-store.ts is the
// Prisma one). No Next.js imports.
import { z } from "zod";
import { normalizePhone, whatsappTarget } from "./links.ts";
import type { Decision } from "./qr.ts";
import { newShopValues, saveDraft, type EditorStore } from "./shop-editor.ts";

export const ONBOARDING_STAGES = ["lead", "building", "preview_sent", "printing", "live"] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

export const STAGE_INFO: Record<OnboardingStage, { title: string; hint: string }> = {
  lead: { title: "Lead", hint: "Collect name, logo and links" },
  building: { title: "Building", hint: "Theme, buttons, offers" },
  preview_sent: { title: "Preview sent", hint: "Waiting for approval and payment" },
  printing: { title: "Printing", hint: "Approved, paid, standee in progress" },
  live: { title: "Live this week", hint: "First scans and the first report" },
};

/** Cards in the last column drop off the board after this many days. */
export const LIVE_WEEK_DAYS = 7;
const DAY_MS = 24 * 3600_000;

export type BoardShop = {
  id: string;
  name: string;
  shopType: string | null;
  stage: OnboardingStage;
  stageChangedAt: Date;
  hasPublished: boolean;
  hasLogo: boolean;
  code: string | null;
  planName: string | null;
  ownerName: string | null;
  ownerWhatsapp: string | null;
  /** Counted scans so far, from daily_stats. */
  scans: number;
};

export type OnboardingStore = {
  /** Shops that are not archived. */
  board(): Promise<BoardShop[]>;
  setStage(args: { shopId: string; stage: OnboardingStage; from: OnboardingStage; what: string; userEmail: string }): Promise<void>;
  stageOf(shopId: string): Promise<{ name: string; stage: OnboardingStage } | null>;
};

export type CardTone = "neutral" | "amber" | "blue" | "red" | "green";

export type BoardCard = {
  id: string;
  name: string;
  sub: string;
  tag: string;
  tone: CardTone;
  action: { label: string; href: string; external: boolean };
  /** The one next step worth highlighting. */
  primary: boolean;
};

export type BoardColumn = { stage: OnboardingStage; title: string; hint: string; cards: BoardCard[] };
export type TodayTask = { label: string; href: string; external: boolean };
export type OnboardingData = { today: TodayTask[]; columns: BoardColumn[] };

function whole(then: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
}

function ago(days: number): string {
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(d: Date): string {
  const india = new Date(d.getTime() + 5.5 * 3600_000);
  return `${india.getUTCDate()} ${MONTHS[india.getUTCMonth()]}`;
}

function nudge(shop: BoardShop, text: string): { href: string; external: boolean } {
  const link = shop.ownerWhatsapp ? whatsappTarget(shop.ownerWhatsapp, text) : null;
  return link ? { href: link, external: true } : { href: `/admin/shops/${shop.id}`, external: false };
}

function card(shop: BoardShop, now: Date): BoardCard {
  const open = { href: `/admin/shops/${shop.id}`, external: false };
  const days = whole(shop.stageChangedAt, now);
  const type = shop.shopType ?? "Shop";
  const base = { id: shop.id, name: shop.name };

  switch (shop.stage) {
    case "lead":
      return {
        ...base,
        sub: type,
        tag: days === 0 ? "Today" : days === 1 ? "Yesterday" : shortDate(shop.stageChangedAt),
        tone: "neutral",
        action: { label: "Collect details", ...open },
        primary: false,
      };
    case "building": {
      const ready = shop.hasPublished;
      const link = nudge(shop, `Hi, we need your logo to finish the page for ${shop.name}. Could you send it here?`);
      return {
        ...base,
        sub: `${type} · ${shop.planName ?? "No plan yet"}`,
        tag: ready ? "Published, ready to preview" : shop.hasLogo ? "In progress" : "Waiting for logo",
        tone: ready ? "blue" : shop.hasLogo ? "neutral" : "amber",
        action: ready || shop.hasLogo ? { label: "Open editor", ...open } : { label: link.external ? "Request logo" : "Open editor", ...link },
        primary: ready,
      };
    }
    case "preview_sent": {
      const link = nudge(shop, `Hi, did you get a chance to look at the preview of your page for ${shop.name}?`);
      return {
        ...base,
        sub: `${type} · ${shop.planName ?? "No plan yet"}`,
        tag: `Sent ${ago(days)}`,
        tone: days >= 5 ? "red" : days >= 2 ? "amber" : "neutral",
        action: { label: link.external ? "Nudge on WhatsApp" : "Open shop", ...link },
        primary: false,
      };
    }
    case "printing":
      return {
        ...base,
        sub: `${type} · ${shop.planName ?? "No plan yet"}`,
        tag: shop.code ? `Code ${shop.code} assigned` : "No QR code yet",
        tone: shop.code ? "green" : "amber",
        action: { label: shop.code ? "Print files" : "Assign a code", ...open },
        primary: Boolean(shop.code),
      };
    case "live":
      return {
        ...base,
        sub: `${type} · ${shop.planName ?? "No plan yet"}`,
        tag: shop.scans === 0 ? "No scans yet" : `Live ${ago(days)}`,
        tone: shop.scans === 0 ? "amber" : "green",
        action: { label: shop.scans === 0 ? "Check placement" : "Open shop", ...open },
        primary: false,
      };
  }
}

function todayTasks(shops: BoardShop[], now: Date): TodayTask[] {
  const tasks: TodayTask[] = [];
  for (const s of shops) {
    const days = whole(s.stageChangedAt, now);
    const open = { href: `/admin/shops/${s.id}`, external: false };
    if (s.stage === "building" && s.hasPublished) tasks.push({ label: `Send preview to ${s.name}`, ...open });
    if (s.stage === "preview_sent" && days >= 2) {
      tasks.push({
        label: `Follow up with ${s.name}`,
        ...nudge(s, `Hi, did you get a chance to look at the preview of your page for ${s.name}?`),
      });
    }
    if (s.stage === "printing" && s.code) tasks.push({ label: `Ship ${s.name} standee`, ...open });
  }
  return tasks;
}

export async function getOnboarding(store: OnboardingStore, now: Date = new Date()): Promise<OnboardingData> {
  const all = await store.board();
  // Live shops stay on the board for a week, then the board is theirs no more.
  const shops = all.filter(
    (s) => s.stage !== "live" || now.getTime() - s.stageChangedAt.getTime() < LIVE_WEEK_DAYS * DAY_MS,
  );
  const columns = ONBOARDING_STAGES.map((stage) => ({
    stage,
    ...STAGE_INFO[stage],
    cards: shops
      .filter((s) => s.stage === stage)
      // Longest waiting first.
      .sort((a, b) => a.stageChangedAt.getTime() - b.stageChangedAt.getTime())
      .map((s) => card(s, now)),
  }));
  return { today: todayTasks(shops, now), columns };
}

export function isStage(value: unknown): value is OnboardingStage {
  return typeof value === "string" && (ONBOARDING_STAGES as readonly string[]).includes(value);
}

/** Moves one shop to another column. Role checks belong to the caller. */
export async function moveStage(
  store: OnboardingStore,
  shopId: string,
  stage: unknown,
  userEmail: string,
): Promise<Decision> {
  if (!isStage(stage)) return { ok: false, error: "Choose a column to move to." };
  const current = await store.stageOf(shopId);
  if (!current) return { ok: false, error: "This shop no longer exists." };
  if (current.stage === stage) return { ok: false, error: `${current.name} is already in ${STAGE_INFO[stage].title}.` };
  await store.setStage({
    shopId,
    stage,
    from: current.stage,
    what: `Onboarding: moved from ${STAGE_INFO[current.stage].title} to ${STAGE_INFO[stage].title}`,
    userEmail,
  });
  return { ok: true };
}

const leadSchema = z.object({
  name: z.string().trim().min(1, "Enter the shop name.").max(120, "That name is too long."),
  shopType: z.string().trim().max(60).default(""),
  whatsapp: z.string().trim().max(30).default(""),
  note: z.string().trim().max(500).default(""),
});

/** A new shop that starts in the Lead column: name, type, the owner's WhatsApp and a note. */
export async function createLead(
  editor: EditorStore,
  store: OnboardingStore,
  input: unknown,
  userEmail: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { name, shopType, whatsapp, note } = parsed.data;
  if (whatsapp && !normalizePhone(whatsapp)) {
    return { ok: false, error: "That WhatsApp number does not look right. Use a 10 digit number or start with +." };
  }
  const values = newShopValues();
  values.details = { ...values.details, name, shopType, ownerWhatsapp: whatsapp, notes: note };
  const saved = await saveDraft(editor, null, values, userEmail);
  if (!saved.ok) return saved;
  await store.setStage({ shopId: saved.id, stage: "lead", from: "building", what: "Onboarding: added as a lead", userEmail });
  return { ok: true, id: saved.id };
}
