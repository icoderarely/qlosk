import type { NextRequest } from "next/server";
import { SAMPLE_LINKS, SAMPLE_SHOP } from "@/components/shop-page/sample";
import { FONT_IDS, THEME_IDS, type FontId, type ThemeId } from "@/components/shop-page/types";
import { renderShopCard } from "@/lib/share-card-image";
import { shareCardModel } from "@/services/share-card";

// Sample card for the /dev/share-card gallery: ?theme=&font=&name=&buttons=a,b (link types to keep).
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const theme = THEME_IDS.find((t) => t === q.get("theme")) ?? "daylight";
  const font = FONT_IDS.find((f) => f === q.get("font")) ?? "clean";
  const keep = q.get("buttons")?.split(",");
  const model = shareCardModel({
    theme: theme as ThemeId,
    font: font as FontId,
    layout: "list",
    shop: { ...SAMPLE_SHOP, name: q.get("name") ?? SAMPLE_SHOP.name },
    links: keep ? SAMPLE_LINKS.filter((l) => keep.includes(l.type)) : SAMPLE_LINKS,
  });
  return renderShopCard(model, { cacheControl: "no-store" });
}
