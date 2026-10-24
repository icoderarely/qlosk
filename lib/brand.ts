// Product name. Change it here once and every title, wordmark and "Powered by" line follows.
export const BRAND_NAME = "Qlosk";
// Placeholders on the landing page footer, to replace before launch (spec section 10).
// The number every "Chat on WhatsApp" button opens (10-digit Indian mobile). Set it
// with WHATSAPP_NUMBER in the environment; there is no built-in number. Server-only.
export const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER ?? "";
export const SUPPORT_EMAIL = "support@qlosk.com";
// Placeholders on the legal pages (privacy, terms, refunds), to replace before launch.
export const LEGAL_ENTITY = "[registered business name]";
export const LEGAL_CITY = "[city]";
/** Shown as "Last updated" on all three legal pages. Change it whenever the wording changes. */
export const LEGAL_UPDATED = "24 October 2026";
