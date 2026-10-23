// Fake settings, from docs/design/AdminApp.dc.html and spec section 4.
import type { LayoutId, ThemeId } from "../../components/shop-page/types.ts";

export type MockAccount = { username: string; role: "owner" | "admin" | "viewer" };

export type ShopTypeOption = {
  /** Label in the Shop type dropdown. */
  label: string;
  /** Plural noun used in "Suggested for salons". */
  plural: string;
  suggested: { theme: ThemeId; layout: LayoutId } | null;
};

// Suggested look by shop type lives in settings, not in code (spec section 5).
// The design lists a theme and layout only.
export const SHOP_TYPE_OPTIONS: ShopTypeOption[] = [
  { label: "Salon and spa", plural: "salons", suggested: { theme: "blush", layout: "list" } },
  { label: "Clinic", plural: "clinics", suggested: { theme: "daylight", layout: "list" } },
  { label: "Gym", plural: "gyms", suggested: { theme: "nightfall", layout: "index" } },
  { label: "Cafe and bakery", plural: "cafes and bakeries", suggested: { theme: "marigold", layout: "tiles" } },
  { label: "Jeweller", plural: "jewellers", suggested: { theme: "graphite", layout: "cover" } },
  { label: "Boutique", plural: "boutiques", suggested: null },
];

export type MockSettings = {
  accounts: MockAccount[];
  enabledThemes: Record<ThemeId, boolean>;
  enabledLayouts: Record<LayoutId, boolean>;
  filtering: { id: string; label: string; switchLabel: string; enabled: boolean }[];
  domain: { qrBase: string; whatsappSender: string };
};

export const SETTINGS: MockSettings = {
  accounts: [
    { username: "[owner username]", role: "owner" },
    { username: "[team username]", role: "admin" },
    { username: "[helper username]", role: "viewer" },
  ],
  enabledThemes: { daylight: true, nightfall: true, marigold: true, blush: true, graphite: true },
  enabledLayouts: { list: true, tiles: true, cover: true, index: true, chat: true },
  filtering: [
    { id: "crawlers", label: "Ignore crawlers, link previews and prefetch", switchLabel: "Ignore crawlers", enabled: true },
    { id: "token", label: "Count a button tap only if the page was opened first", switchLabel: "Require page token", enabled: true },
    { id: "dedupe", label: "Count the same device once within 30 seconds", switchLabel: "Dedupe", enabled: true },
    { id: "rateLimit", label: "Flag a device that sends too many requests a minute", switchLabel: "Rate limit", enabled: true },
    { id: "spikes", label: "Hold back sudden spikes for review", switchLabel: "Spike review", enabled: true },
  ],
  domain: { qrBase: "", whatsappSender: "" },
};
