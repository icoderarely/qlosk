import type { Banner, LayoutId, Offer, ShopInfo, ShopLink, WifiInfo } from "./types";

// Fake shop copied from docs/design/ShopPage.dc.html. The "#" targets are
// placeholders; the Wi-Fi details and banner are invented for the gallery.
export const SAMPLE_SHOP: ShopInfo = {
  name: "Velvet Salon & Spa",
  tagline: "Hair, skin and bridal studio",
  area: "Bandra West",
  city: "Mumbai",
};

export const SAMPLE_LINKS: ShopLink[] = [
  {
    id: "sample-whatsapp",
    type: "whatsapp",
    label: "Book on WhatsApp",
    hint: "Opens WhatsApp",
    href: "#",
  },
  {
    id: "sample-call",
    type: "call",
    label: "Call us",
    hint: "Talk to the desk",
    href: "#",
  },
  {
    id: "sample-review",
    type: "google_review",
    label: "Review us on Google",
    shortLabel: "Review us",
    hint: "On Google",
    href: "#",
  },
  {
    id: "sample-wifi",
    type: "wifi",
    label: "Wi-Fi password",
    shortLabel: "Wi-Fi",
    hint: "Tap to show password",
    href: "#",
  },
  {
    id: "sample-maps",
    type: "maps",
    label: "Get directions",
    shortLabel: "Directions",
    hint: "Open in Maps",
    href: "#",
  },
  {
    id: "sample-instagram",
    type: "instagram",
    label: "Follow on Instagram",
    shortLabel: "Instagram",
    hint: "Follow us",
    href: "#",
  },
];

// The tiles board in the design has a sixth tile, Services. The other boards
// do not, so sampleLinks() adds it for the tiles layout only.
export const SAMPLE_MENU_LINK: ShopLink = {
  id: "sample-menu",
  type: "menu",
  label: "Services",
  hint: "Prices and menu",
  href: "#",
};

export const SAMPLE_OFFER: Offer = {
  title: "10% off your first visit",
  note: "Show this page at the desk",
  code: "WELCOME10",
};

export const SAMPLE_WIFI: WifiInfo = {
  network: "VelvetSalon-Guest",
  password: "welcome-sample",
};

export const SAMPLE_BANNER: Banner = {
  text: "Happy Diwali from all of us",
};

export function sampleLinks(layout: LayoutId): ShopLink[] {
  return layout === "tiles" ? [...SAMPLE_LINKS, SAMPLE_MENU_LINK] : SAMPLE_LINKS;
}
