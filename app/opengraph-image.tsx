import { BRAND_NAME } from "@/lib/brand";
import { renderGenericCard } from "@/lib/share-card-image";

export const alt = BRAND_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The card for qlosk.com and every page without its own: the mark and the name.
export default function OpengraphImage() {
  return renderGenericCard({ cacheControl: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" });
}
