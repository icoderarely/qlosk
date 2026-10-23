// Shop page addresses (/s/<slug>). No Next.js imports.

// Paths that already mean something under the site root.
const RESERVED = new Set([
  "admin", "admin-login", "api", "s", "q", "r", "playground", "dev", "new", "login", "static",
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 50;

/** "Velvet Salon & Spa" -> "velvet-salon-and-spa". Never empty. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
  return slug.length >= SLUG_MIN ? slug : slug ? `${slug}-shop`.slice(0, SLUG_MAX) : "shop";
}

/** Returns an error message, or null when the slug is allowed. */
export function checkSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `The address needs at least ${SLUG_MIN} characters.`;
  if (slug.length > SLUG_MAX) return `The address can be at most ${SLUG_MAX} characters.`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return "Use lowercase letters, numbers and single hyphens only.";
  }
  if (RESERVED.has(slug)) return "That address is reserved. Choose another.";
  return null;
}

/** First free slug: base, base-2, base-3, ... */
export async function freeSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  for (let n = 2; await isTaken(candidate) || checkSlug(candidate) !== null; n++) {
    candidate = `${base.slice(0, SLUG_MAX - String(n).length - 1)}-${n}`;
    if (n > 500) throw new Error("Could not find a free address.");
  }
  return candidate;
}
