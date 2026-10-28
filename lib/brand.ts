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
// Where the QR product's own marketing site lives; structured data and llms.txt describe this address.
export const QR_URL = `${SITE_URL}/qr`;
export const SITE_DESCRIPTION =
  "One QR code for your whole shop: Call, WhatsApp, Google review, Wi-Fi, Maps and your latest offer. We build the page, print the standee and send a monthly report.";
// Details on the legal pages. Set them in the environment on Vercel (see .env.example).
// Anything left empty is simply left out of the pages, so no placeholder text is shown.
// Registered business name; falls back to the brand name until one is set.
export const LEGAL_ENTITY = process.env.LEGAL_ENTITY || BRAND_NAME;
// City whose courts handle disputes. Empty means the terms name no city.
export const LEGAL_CITY = process.env.LEGAL_CITY ?? "";
// Registered office address, shown in the contact card.
export const LEGAL_ADDRESS = process.env.LEGAL_ADDRESS ?? "";
// GSTIN, shown in the contact card once the business is registered for GST.
export const LEGAL_GSTIN = process.env.LEGAL_GSTIN ?? "";
// Person who handles privacy complaints (DPDP Act); defaults to the support team.
export const GRIEVANCE_OFFICER = process.env.GRIEVANCE_OFFICER ?? "";
/** Shown as "Last updated" on all three legal pages. Change it whenever the wording changes. */
export const LEGAL_UPDATED = "26 October 2026";
