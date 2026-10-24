import type { MetadataRoute } from "next";
import { LEGAL_UPDATED, SITE_URL } from "@/lib/brand";

// Only pages worth ranking. Shop pages (/s/…), admin and redirects stay out.
export default function sitemap(): MetadataRoute.Sitemap {
  const legalUpdated = new Date(LEGAL_UPDATED);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/playground`, changeFrequency: "monthly", priority: 0.7 },
    ...["privacy", "terms", "refunds"].map((p) => ({
      url: `${SITE_URL}/${p}`,
      lastModified: legalUpdated,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
