// Shop reads for the admin. For now they return fake data from lib/mock; a
// later slice swaps the inside of each function for a database query and the
// pages stay the same. No Next.js imports (repo rule).
import {
  DEFAULT_LINKS,
  type MockLink,
} from "../lib/mock/links.ts";
import {
  EMPTY_BANNER,
  EMPTY_DETAILS,
  EMPTY_OFFER,
  EMPTY_WIFI,
  SHOPS,
  SHOP_TAB_COUNTS,
  TRAFFIC,
  VELVET_CHANGES,
  VELVET_DETAILS,
  VELVET_OFFER,
  VELVET_WIFI,
  type MockBanner,
  type MockChange,
  type MockDetails,
  type MockOffer,
  type MockShop,
  type MockTraffic,
  type MockWifi,
  type PaymentStatus,
  type PlanName,
  type ShopStatus,
  type ShopTab,
} from "../lib/mock/shops.ts";
import type { FontId, LayoutId, ThemeId } from "../components/shop-page/types.ts";

export type { PaymentStatus, PlanName, ShopStatus, ShopTab };

export type ShopRow = MockShop;

export type ShopList = {
  shops: ShopRow[];
  tabCounts: Record<ShopTab, number>;
};

export async function getShops(): Promise<ShopList> {
  return { shops: SHOPS.map((s) => ({ ...s })), tabCounts: { ...SHOP_TAB_COUNTS } };
}

export type ShopEditorData = {
  /** null for a shop that has not been created yet. */
  id: string | null;
  status: ShopStatus;
  slug: string;
  code: string | null;
  plan: PlanName;
  renewsOn: string;
  payment: PaymentStatus;
  details: MockDetails;
  links: MockLink[];
  look: { theme: ThemeId; layout: LayoutId; font: FontId };
  offer: MockOffer;
  banner: MockBanner;
  wifi: MockWifi;
  changes: MockChange[];
  traffic: MockTraffic;
};

// The design's shop types, used when a sample shop's free-text type matches one.
const TYPE_OPTION: Record<string, string> = {
  Salon: "Salon and spa",
  Clinic: "Clinic",
  Gym: "Gym",
  Cafe: "Cafe and bakery",
  Jewellery: "Jeweller",
  Boutique: "Boutique",
};

export async function getShopEditor(id: string): Promise<ShopEditorData | null> {
  const shop = SHOPS.find((s) => s.id === id);
  if (!shop) return null;
  const isVelvet = shop.id === "1";
  return {
    id: shop.id,
    status: shop.status,
    slug: shop.slug,
    code: shop.code,
    plan: shop.plan,
    renewsOn: shop.renewsOn,
    payment: shop.payment,
    details: isVelvet
      ? { ...VELVET_DETAILS }
      : {
          ...EMPTY_DETAILS,
          name: shop.name,
          shopType: TYPE_OPTION[shop.typeLabel] ?? shop.typeLabel,
        },
    links: DEFAULT_LINKS.map((l) => ({ ...l })),
    look: { theme: shop.theme, layout: shop.layout, font: shop.font },
    offer: isVelvet ? { ...VELVET_OFFER } : { ...EMPTY_OFFER },
    banner: { ...EMPTY_BANNER },
    wifi: isVelvet ? { ...VELVET_WIFI } : { ...EMPTY_WIFI },
    changes: isVelvet ? VELVET_CHANGES.map((c) => ({ ...c })) : [],
    traffic: { ...TRAFFIC[shop.id] },
  };
}

export async function getNewShopEditor(): Promise<ShopEditorData> {
  return {
    id: null,
    status: "building",
    slug: "",
    code: null,
    plan: "Yearly",
    renewsOn: "Not started",
    payment: "not_started",
    details: { ...EMPTY_DETAILS },
    links: DEFAULT_LINKS.map((l) => ({ ...l })),
    look: { theme: "daylight", layout: "list", font: "clean" },
    offer: { ...EMPTY_OFFER },
    banner: { ...EMPTY_BANNER },
    wifi: { ...EMPTY_WIFI },
    changes: [],
    traffic: { scans: null, taps: null, bots: null, lastScan: "Never" },
  };
}
