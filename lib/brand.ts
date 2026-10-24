// Product name. Change it here once and every title, wordmark and "Powered by" line follows.
export const BRAND_NAME = "Qlosk";
// Placeholders on the landing page footer, to replace before launch (spec section 10).
// The number every "Chat on WhatsApp" button opens (10-digit Indian mobile). Set it
// with WHATSAPP_NUMBER in the environment; there is no built-in number. Server-only.
export const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER ?? "";
export const SUPPORT_EMAIL = "support@qlosk.com";
// Public origin of the marketing site (no trailing slash). Used for canonicals, the sitemap,
// social cards and structured data. Set SITE_URL on Vercel; it defaults to the live domain.
export const SITE_URL = (process.env.SITE_URL ?? "https://qlosk.com").replace(/\/+$/, "");
export const SITE_DESCRIPTION =
  "One QR code for your whole shop: Call, WhatsApp, Google review, Wi-Fi, Maps and your latest offer. We build the page, print the standee and send a monthly report.";
// Placeholders on the legal pages (privacy, terms, refunds), to replace before launch.
export const LEGAL_ENTITY = "[registered business name]";
export const LEGAL_CITY = "[city]";
/** Shown as "Last updated" on all three legal pages. Change it whenever the wording changes. */
export const LEGAL_UPDATED = "24 October 2026";
