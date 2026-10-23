// Icon paths from docs/design/AdminApp.dc.html (24px grid, 2px stroke). The
// sidebar icons live in nav.ts.
import type { LinkType } from "../shop-page/types";

export const ICON_PLUS = "M12 5v14M5 12h14";
export const ICON_CHEVRON_DOWN = "M6 9l6 6 6-6";
export const ICON_DOWNLOAD = "M12 4v11M7 11l5 5 5-5M5 20h14";
export const ICON_UPLOAD = "M12 16V5M7 9l5-5 5 5M5 20h14";
export const ICON_EXTERNAL = "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6";
export const ICON_ARROW_LEFT = "M19 12H5M11 6l-6 6 6 6";
export const ICON_SEARCH = "M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14z M20 20l-4-4";
export const ICON_EYE =
  "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z";
export const ICON_GRIP = "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01";

const ICON_LINK =
  "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1";

export const LINK_ICONS: Record<LinkType, string> = {
  whatsapp: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z",
  call: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  google_review:
    "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  wifi: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0",
  maps: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5z",
  instagram:
    "M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z",
  menu: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  // The design has no icons for these; they get the generic link icon.
  facebook: ICON_LINK,
  youtube: ICON_LINK,
  website: ICON_LINK,
  custom: ICON_LINK,
};

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  whatsapp: "WhatsApp",
  call: "Call",
  google_review: "Google review",
  wifi: "Wi-Fi",
  maps: "Maps",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  website: "Website",
  menu: "Menu",
  custom: "Custom link",
};
