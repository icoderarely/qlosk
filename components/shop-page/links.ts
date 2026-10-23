import type { ShopLink, WifiInfo } from "./types";

// Only these schemes may reach an href. Same-site paths (such as the /r/...
// redirect) and "#" are allowed. Anything else renders as "#".
export function safeHref(href: string): string {
  if (href === "#") return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const { protocol } = new URL(href);
    if (protocol === "https:" || protocol === "tel:") return href;
  } catch {
    // not a valid absolute URL
  }
  return "#";
}

export type SplitLinks = {
  /** The big button: the first WhatsApp link, else the first Call link. */
  primary: ShopLink | null;
  /** Everything else, in the order given. */
  rest: ShopLink[];
};

// A Wi-Fi link needs something to show. Without wifi details it is dropped.
export function splitLinks(links: ShopLink[], wifi?: WifiInfo | null): SplitLinks {
  const usable = links.filter((l) => l.type !== "wifi" || wifi);
  const primary =
    usable.find((l) => l.type === "whatsapp") ??
    usable.find((l) => l.type === "call") ??
    null;
  return { primary, rest: usable.filter((l) => l !== primary) };
}

// "Velvet Salon & Spa" -> "VS". Words that start with a letter or digit only.
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((w) => Array.from(w)[0] ?? "")
    .filter((c) => /[\p{L}\p{N}]/u.test(c));
  return letters.slice(0, 2).join("").toUpperCase() || "?";
}

export function locationLine(area?: string | null, city?: string | null): string {
  return [area, city].filter(Boolean).join(", ");
}
