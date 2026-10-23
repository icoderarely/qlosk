// Fake shop data for the admin UI pass. Names and numbers come from
// docs/design/AdminApp.dc.html. Services in services/shops.ts read this file;
// pages never import it. Relative imports only, so node --test can load it.
import type { FontId, LayoutId, ThemeId } from "../../components/shop-page/types.ts";

export type ShopStatus =
  | "live"
  | "quiet"
  | "preview"
  | "printing"
  | "building"
  | "expired";

export type PlanName = "Monthly" | "Yearly" | "5 years";

export type PaymentStatus = "paid" | "due_soon" | "overdue" | "not_started";

export type MockShop = {
  id: string;
  name: string;
  /** Free-text type shown under the name, such as "Sweet shop". */
  typeLabel: string;
  slug: string;
  status: ShopStatus;
  theme: ThemeId;
  layout: LayoutId;
  font: FontId;
  /** null while no QR code is assigned. */
  code: string | null;
  plan: PlanName;
  /** Second line under the plan in the shops list, such as "Renews 14 Mar". */
  planNote: string;
  /** Value of "Renews" on the QR and plan tab. */
  renewsOn: string;
  payment: PaymentStatus;
  /** Counted scans in the last 30 days. null means the page has no scans yet. */
  scans: number | null;
};

export const SHOPS: MockShop[] = [
  {
    id: "1",
    name: "Velvet Salon & Spa",
    typeLabel: "Salon",
    slug: "velvet-salon",
    status: "live",
    theme: "blush",
    layout: "list",
    font: "editorial",
    code: "7KX2M9",
    plan: "Yearly",
    planNote: "Renews 14 Mar",
    renewsOn: "14 Mar",
    payment: "paid",
    scans: 1204,
  },
  {
    id: "2",
    name: "Kaveri Sweets",
    typeLabel: "Sweet shop",
    slug: "kaveri-sweets",
    status: "live",
    theme: "marigold",
    layout: "tiles",
    font: "clean",
    code: "R4PD8T",
    plan: "Monthly",
    planNote: "Renews in 5 days",
    renewsOn: "28 Oct",
    payment: "due_soon",
    scans: 862,
  },
  {
    id: "3",
    name: "Iron House Gym",
    typeLabel: "Gym",
    slug: "iron-house",
    status: "live",
    theme: "nightfall",
    layout: "index",
    font: "clean",
    code: "M2HC6W",
    plan: "5 years",
    planNote: "Ends Aug 2031",
    renewsOn: "Aug 2031",
    payment: "paid",
    scans: 640,
  },
  {
    id: "4",
    name: "Dr. Mehta Dental",
    typeLabel: "Clinic",
    slug: "dr-mehta-dental",
    status: "quiet",
    theme: "daylight",
    layout: "list",
    font: "clean",
    code: "H8WQ5Z",
    plan: "Yearly",
    planNote: "Renews 2 Jan",
    renewsOn: "2 Jan",
    payment: "paid",
    scans: 0,
  },
  {
    id: "5",
    name: "Noor Boutique",
    typeLabel: "Boutique",
    slug: "noor-boutique",
    status: "live",
    theme: "blush",
    layout: "cover",
    font: "clean",
    code: "C3TY7K",
    plan: "Yearly",
    planNote: "Renews 19 Feb",
    renewsOn: "19 Feb",
    payment: "paid",
    scans: 318,
  },
  {
    id: "6",
    name: "Bright Minds Classes",
    typeLabel: "Coaching",
    slug: "bright-minds",
    status: "live",
    theme: "daylight",
    layout: "tiles",
    font: "clean",
    code: "P6LD2N",
    plan: "Monthly",
    planNote: "Renews 5 Nov",
    renewsOn: "5 Nov",
    payment: "due_soon",
    scans: 207,
  },
  {
    id: "7",
    name: "Brew & Bun Cafe",
    typeLabel: "Cafe",
    slug: "brew-and-bun",
    status: "preview",
    theme: "marigold",
    layout: "chat",
    font: "clean",
    code: "J9NV3B",
    plan: "Yearly",
    planNote: "Not started",
    renewsOn: "Not started",
    payment: "not_started",
    scans: null,
  },
  {
    id: "8",
    name: "Aarav Jewellers",
    typeLabel: "Jewellery",
    slug: "aarav-jewellers",
    status: "printing",
    theme: "graphite",
    layout: "cover",
    font: "clean",
    code: null,
    plan: "Yearly",
    planNote: "Not started",
    renewsOn: "Not started",
    payment: "not_started",
    scans: null,
  },
];

// Tab counts as printed in the design. The design lists only 8 of the 48 shops,
// so these are larger than the sample rows. The Live tab includes Quiet and the
// Preview tab includes Printing.
export const SHOP_TAB_COUNTS = {
  all: 48,
  live: 42,
  preview: 3,
  building: 2,
  expired: 1,
} as const;

export type ShopTab = keyof typeof SHOP_TAB_COUNTS;

// ---- Editor extras -------------------------------------------------------

export type MockDetails = {
  name: string;
  tagline: string;
  /** One of the options in SHOP_TYPE_OPTIONS (lib/mock/settings.ts), or the shop's own label. */
  shopType: string;
  areaCity: string;
  address: string;
  phone: string;
  whatsapp: string;
  waMessage: string;
  googleReview: string;
  instagram: string;
  ownerName: string;
  ownerWhatsapp: string;
  notes: string;
};

export type MockOffer = {
  enabled: boolean;
  title: string;
  code: string;
  note: string;
  validUntil: string;
};

export type MockBanner = { enabled: boolean; message: string; period: string };

export type MockWifi = { enabled: boolean; network: string; password: string };

export type MockChange = {
  what: string;
  who: string;
  when: string;
  action: "Undo" | "View" | "Mark done";
};

export type MockTraffic = {
  scans: number | null;
  taps: number | null;
  bots: number | null;
  lastScan: string;
};

export const VELVET_DETAILS: MockDetails = {
  name: "Velvet Salon & Spa",
  tagline: "Hair, skin and bridal studio",
  shopType: "Salon and spa",
  areaCity: "Bandra West, Mumbai",
  address: "",
  phone: "",
  whatsapp: "",
  waMessage: "Hi, I would like to book an appointment.",
  googleReview: "",
  instagram: "",
  ownerName: "",
  ownerWhatsapp: "",
  notes: "",
};

export const EMPTY_DETAILS: MockDetails = {
  name: "",
  tagline: "",
  shopType: "Salon and spa",
  areaCity: "",
  address: "",
  phone: "",
  whatsapp: "",
  waMessage: "",
  googleReview: "",
  instagram: "",
  ownerName: "",
  ownerWhatsapp: "",
  notes: "",
};

export const VELVET_OFFER: MockOffer = {
  enabled: true,
  title: "10% off your first visit",
  code: "WELCOME10",
  note: "Show this page at the desk",
  validUntil: "",
};

export const EMPTY_OFFER: MockOffer = {
  enabled: false,
  title: "",
  code: "",
  note: "",
  validUntil: "",
};

export const EMPTY_BANNER: MockBanner = { enabled: false, message: "", period: "" };

export const VELVET_WIFI: MockWifi = {
  enabled: true,
  network: "VelvetSalon-Guest",
  password: "placeholder",
};

export const EMPTY_WIFI: MockWifi = { enabled: false, network: "", password: "" };

export const VELVET_CHANGES: MockChange[] = [
  { what: "Changed theme from Daylight to Blush", who: "You", when: "Today, 11:20", action: "Undo" },
  { what: "Updated the WhatsApp message", who: "You", when: "Today, 11:05", action: "View" },
  { what: "Owner asked to change the offer code", who: "Owner, via WhatsApp", when: "Yesterday", action: "Mark done" },
  { what: "Published the page", who: "You", when: "12 Oct", action: "View" },
  { what: "Shop created", who: "You", when: "10 Oct", action: "View" },
];

// Taps and flagged counts are in the design only for Velvet; the other
// numbers are from the Reports table. null shows as a dash.
export const TRAFFIC: Record<string, MockTraffic> = {
  "1": { scans: 1204, taps: 512, bots: 38, lastScan: "12 minutes ago" },
  "2": { scans: 862, taps: 344, bots: null, lastScan: "1 hour ago" },
  "3": { scans: 640, taps: 240, bots: null, lastScan: "3 hours ago" },
  "4": { scans: 0, taps: 0, bots: null, lastScan: "9 days ago" },
  "5": { scans: 318, taps: 147, bots: null, lastScan: "Never" },
  "6": { scans: 207, taps: 81, bots: null, lastScan: "Never" },
  "7": { scans: null, taps: null, bots: null, lastScan: "Never" },
  "8": { scans: null, taps: null, bots: null, lastScan: "Never" },
};
