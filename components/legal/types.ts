/** A paragraph (string) or a bullet list (string[]). */
export type LegalBlock = string | string[];
export type LegalSection = { title: string; blocks: LegalBlock[] };
export type LegalDoc = { slug: "terms" | "privacy" | "refunds"; title: string; short: string; intro: string; sections: LegalSection[] };
