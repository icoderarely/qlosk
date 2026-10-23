// Fake page buttons for the shop editor. Labels, hints and short labels match
// the sample links in components/shop-page/sample.ts, so the preview reads like
// docs/design/ShopPage.dc.html.
import type { LinkType } from "../../components/shop-page/types.ts";

export type MockLink = {
  id: string;
  type: LinkType;
  label: string;
  shortLabel?: string;
  hint?: string;
  /** Where the button goes. A bracketed value is a placeholder, as in the design. */
  target: string;
  enabled: boolean;
};

export const DEFAULT_LINKS: MockLink[] = [
  {
    id: "link-whatsapp",
    type: "whatsapp",
    label: "Book on WhatsApp",
    hint: "Opens WhatsApp",
    target: "[number]",
    enabled: true,
  },
  {
    id: "link-call",
    type: "call",
    label: "Call us",
    hint: "Talk to the desk",
    target: "[number]",
    enabled: true,
  },
  {
    id: "link-review",
    type: "google_review",
    label: "Review us on Google",
    shortLabel: "Review us",
    hint: "On Google",
    target: "[review link]",
    enabled: true,
  },
  {
    id: "link-wifi",
    type: "wifi",
    label: "Wi-Fi password",
    shortLabel: "Wi-Fi",
    hint: "Tap to show password",
    target: "Tap to show",
    enabled: true,
  },
  {
    id: "link-maps",
    type: "maps",
    label: "Get directions",
    shortLabel: "Directions",
    hint: "Open in Maps",
    target: "[maps link]",
    enabled: true,
  },
  {
    id: "link-instagram",
    type: "instagram",
    label: "Follow on Instagram",
    shortLabel: "Instagram",
    hint: "Follow us",
    target: "[handle]",
    enabled: true,
  },
  {
    id: "link-menu",
    type: "menu",
    label: "Services and prices",
    shortLabel: "Services",
    hint: "Prices and menu",
    target: "[price list link]",
    enabled: false,
  },
];

// Link types a shop can still add (design: "Add another").
export const ADDABLE_LINK_LABELS = [
  "Facebook",
  "YouTube",
  "Website",
  "Menu or price list",
  "Custom link",
] as const;
