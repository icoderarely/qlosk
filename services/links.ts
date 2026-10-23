// Page-button rules (spec section 8: link targets allow only https, tel and
// wa.me URLs). No Next.js imports; relative imports only so node --test loads it.
import type { LinkType } from "../components/shop-page/types.ts";

export const LINK_TYPES: readonly LinkType[] = [
  "whatsapp",
  "call",
  "google_review",
  "wifi",
  "maps",
  "instagram",
  "facebook",
  "youtube",
  "website",
  "menu",
  "custom",
];

// Label, short label (tiles) and hint for a new button of each type. Same
// wording as the sample links in components/shop-page/sample.ts.
export const LINK_DEFAULTS: Record<LinkType, { label: string; shortLabel?: string; hint?: string }> = {
  whatsapp: { label: "Book on WhatsApp", hint: "Opens WhatsApp" },
  call: { label: "Call us", hint: "Talk to the desk" },
  google_review: { label: "Review us on Google", shortLabel: "Review us", hint: "On Google" },
  wifi: { label: "Wi-Fi password", shortLabel: "Wi-Fi", hint: "Tap to show password" },
  maps: { label: "Get directions", shortLabel: "Directions", hint: "Open in Maps" },
  instagram: { label: "Follow on Instagram", shortLabel: "Instagram", hint: "Follow us" },
  facebook: { label: "Find us on Facebook", shortLabel: "Facebook", hint: "Follow us" },
  youtube: { label: "Watch on YouTube", shortLabel: "YouTube", hint: "Watch our videos" },
  website: { label: "Visit our website", shortLabel: "Website", hint: "Open the site" },
  menu: { label: "Services and prices", shortLabel: "Services", hint: "Prices and menu" },
  custom: { label: "More information" },
};

/** Types whose target is built from the shop's phone numbers or Wi-Fi block,
 * so the Buttons tab does not let you type one. */
export const DERIVED_LINK_TYPES: readonly LinkType[] = ["call", "whatsapp", "wifi"];

/** The Wi-Fi button reveals the password in place; it has no outside link. */
export const WIFI_TARGET = "wifi";

/**
 * Indian numbers to digits with the country code: "98200 12345" and
 * "+91 98200 12345" both give "919820012345"; a landline with STD code such as
 * "022 2345 6789" gives "912223456789". Numbers outside India are accepted
 * only with a leading "+". Returns null when it cannot make sense of it.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^[+\d\s\-()]+$/.test(trimmed)) return null;
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (plus) {
    if (digits.startsWith("91")) return digits.length === 12 ? digits : null;
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }
  if (digits.length === 10 && /^[2-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0") && /^[2-9]/.test(digits[1])) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91") && /^[2-9]/.test(digits[2])) return digits;
  return null;
}

export function telTarget(phone: string): string | null {
  const n = normalizePhone(phone);
  return n ? `tel:+${n}` : null;
}

export function whatsappTarget(number: string, message: string): string | null {
  const n = normalizePhone(number);
  if (!n) return null;
  const text = message.trim();
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export type TargetResult = { ok: true; value: string } | { ok: false; error: string };

const HANDLE = /^@?([A-Za-z0-9._]{1,30})$/;

function httpsUrl(raw: string): URL | null {
  let text = raw.trim();
  // People paste "wa.me/..." or "www.example.com" without the scheme.
  if (/^(www\.|wa\.me\/)/i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Checks one button target typed by an admin. Empty is fine here (the shop may
 * not have it yet); publishing is stricter and needs one for every enabled
 * button. Only https, tel and wa.me survive: javascript:, data:, http: and
 * anything else is rejected.
 */
export function validateTarget(type: LinkType, raw: string): TargetResult {
  const text = raw.trim();
  if (!text) return { ok: true, value: "" };
  if (type === "wifi") return { ok: true, value: WIFI_TARGET };

  if (type === "call") {
    const tel = /^tel:/i.test(text) ? text.slice(4) : text;
    const n = normalizePhone(tel);
    return n ? { ok: true, value: `tel:+${n}` } : { ok: false, error: "Enter a valid phone number." };
  }

  if (type === "instagram") {
    const handle = HANDLE.exec(text);
    if (handle) return { ok: true, value: `https://instagram.com/${handle[1]}` };
  }

  const url = httpsUrl(text);
  if (!url) return { ok: false, error: "Use a link that starts with https://." };
  if (type === "whatsapp" && url.hostname !== "wa.me") {
    return { ok: false, error: "A WhatsApp link must be a wa.me link." };
  }
  return { ok: true, value: url.toString() };
}

export type LinkDraft = {
  id: string;
  type: LinkType;
  label: string;
  target: string;
  enabled: boolean;
};

export type ResolvedLinks = {
  links: LinkDraft[];
  /** Always blocks a save: a target that was typed but is not allowed. */
  errors: string[];
  /** Blocks publishing only: an enabled button with nothing to open. */
  missing: string[];
};

/**
 * Fills in the targets that come from elsewhere (call and WhatsApp from the
 * phone numbers) and validates the rest.
 */
export function resolveLinks(
  links: LinkDraft[],
  shop: { phone: string; whatsapp: string; waMessage: string },
): ResolvedLinks {
  const errors: string[] = [];
  const missing: string[] = [];
  const out = links.map((link) => {
    let target = "";
    if (link.type === "call") {
      if (shop.phone.trim()) {
        target = telTarget(shop.phone) ?? "";
        if (!target) errors.push("The phone number does not look right.");
      }
    } else if (link.type === "whatsapp") {
      if (shop.whatsapp.trim()) {
        target = whatsappTarget(shop.whatsapp, shop.waMessage) ?? "";
        if (!target) errors.push("The WhatsApp number does not look right.");
      }
    } else if (link.type === "wifi") {
      // The page drops a Wi-Fi button that has no Wi-Fi details, so there is
      // nothing to block on here.
      target = WIFI_TARGET;
    } else {
      const result = validateTarget(link.type, link.target);
      if (result.ok) target = result.value;
      else errors.push(`"${link.label}": ${result.error}`);
    }
    if (link.enabled && !target && link.type !== "wifi") {
      const where =
        link.type === "call" ? "Add the phone number in Details." :
        link.type === "whatsapp" ? "Add the WhatsApp number in Details." :
        "Add a link.";
      missing.push(`"${link.label}" is on but has no link. ${where}`);
    }
    return { ...link, target };
  });
  return { links: out, errors, missing };
}

/** Moves one item; out-of-range moves return the list unchanged. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
