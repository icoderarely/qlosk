// Fake sample shops for the playground, one per shop type. Nothing here is a
// real business. The suggested look per type is the one Settings holds
// (lib/mock/settings.ts today, the settings table later) and is passed in.
import type {
  Banner,
  Offer,
  ShopInfo,
  ShopLink,
  WifiInfo,
} from "../shop-page/types.ts";

export const SHOP_TYPE_IDS = ["salon", "clinic", "gym", "cafe", "jeweller"] as const;
export type ShopTypeId = (typeof SHOP_TYPE_IDS)[number];

export type SampleShop = {
  label: string;
  shop: ShopInfo;
  links: ShopLink[];
  offer: Offer;
  wifi: WifiInfo | null;
  banner: Banner | null;
  /** The matching shop type name in Settings, to look up its suggested look. */
  settingsType: string;
};

function link(
  type: ShopLink["type"],
  label: string,
  hint: string,
  shortLabel?: string,
): ShopLink {
  return { id: `sample-${type}`, type, label, shortLabel, hint, href: "#" };
}

const common = (cta: string, menuLabel: string, menuShort: string) => [
  link("whatsapp", cta, "Opens WhatsApp"),
  link("call", "Call us", "Talk to the desk"),
  link("google_review", "Review us on Google", "On Google", "Review us"),
  link("wifi", "Wi-Fi password", "Tap to show password", "Wi-Fi"),
  link("maps", "Get directions", "Open in Maps", "Directions"),
  link("instagram", "Follow on Instagram", "Follow us", "Instagram"),
  link("menu", menuLabel, "Prices and menu", menuShort),
];

export const SAMPLES: Record<ShopTypeId, SampleShop> = {
  salon: {
    label: "Salon",
    settingsType: "Salon and spa",
    shop: { name: "Velvet Salon & Spa", tagline: "Hair, skin and bridal studio", area: "Bandra West", city: "Mumbai" },
    links: common("Book on WhatsApp", "Services and prices", "Services"),
    offer: { title: "10% off your first visit", note: "Show this page at the desk", code: "WELCOME10" },
    wifi: { network: "Salon-Guest", password: "welcome-sample" },
    banner: null,
  },
  clinic: {
    label: "Clinic",
    settingsType: "Clinic",
    shop: { name: "Sunrise Dental Clinic", tagline: "Family dentistry and braces", area: "Koregaon Park", city: "Pune" },
    links: common("Book an appointment", "Treatments and fees", "Treatments"),
    offer: { title: "Free check-up for new patients", note: "Mention this page at the desk", code: "HELLO1" },
    wifi: { network: "Clinic-Guest", password: "welcome-sample" },
    banner: null,
  },
  gym: {
    label: "Gym",
    settingsType: "Gym",
    shop: { name: "Iron House Gym", tagline: "Strength, cardio and classes", area: "Indiranagar", city: "Bengaluru" },
    links: common("Ask about membership", "Plans and fees", "Plans"),
    offer: { title: "Free trial day", note: "Bring this page to the front desk", code: "TRYIRON" },
    wifi: { network: "Gym-Guest", password: "welcome-sample" },
    banner: null,
  },
  cafe: {
    label: "Cafe",
    settingsType: "Cafe and bakery",
    shop: { name: "Brew & Bun Cafe", tagline: "Coffee, buns and quiet corners", area: "Hauz Khas", city: "New Delhi" },
    links: common("Order on WhatsApp", "Menu", "Menu"),
    offer: { title: "Free bun with any coffee", note: "Show this page when you order", code: "BUNFREE" },
    wifi: { network: "Cafe-Guest", password: "welcome-sample" },
    banner: null,
  },
  jeweller: {
    label: "Jeweller",
    settingsType: "Jeweller",
    shop: { name: "Aarav Jewellers", tagline: "Gold, diamond and bridal sets", area: "Zaveri Bazaar", city: "Mumbai" },
    links: common("Chat with us", "Collections", "Collections").filter((l) => l.type !== "wifi"),
    offer: { title: "No making charges on your first order", note: "Show this page in store", code: "FIRST" },
    wifi: null,
    banner: null,
  },
};
