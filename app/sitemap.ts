import type { MetadataRoute } from "next";
import { LEGAL_UPDATED, SITE_URL } from "@/lib/brand";

// Only pages worth ranking, for every product on the domain. Shop pages (/qr/s/…), admin and
// redirects stay out. The Mathlo legal pages are static files in public/mathlo/.
export default function sitemap(): MetadataRoute.Sitemap {
  const legalUpdated = new Date(LEGAL_UPDATED);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/mathlo`, changeFrequency: "weekly", priority: 0.9 },
    ...["privacy", "terms", "support"].map((p) => ({
      url: `${SITE_URL}/mathlo/${p}`,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    { url: `${SITE_URL}/qr`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/qr/playground`, changeFrequency: "monthly", priority: 0.7 },
    ...["privacy", "terms", "refunds"].map((p) => ({
      url: `${SITE_URL}/qr/${p}`,
      lastModified: legalUpdated,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
