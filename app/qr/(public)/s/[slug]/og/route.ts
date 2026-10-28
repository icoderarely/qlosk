import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { createPublicStore } from "@/lib/public-page-store";
import { renderGenericCard, renderShopCard } from "@/lib/share-card-image";
import { lookupPublicPage } from "@/services/public-page";
import { shareCardModel } from "@/services/share-card";

// The card chat apps show for a shop link (1200 x 630 PNG). Built from the
// published page only; a slug with no live page gets the generic Qlosk card.
export async function GET(_request: NextRequest, ctx: RouteContext<"/qr/s/[slug]/og">) {
  const { slug } = await ctx.params;
  const result = await lookupPublicPage(createPublicStore(getDb()), slug);
  if (result.kind !== "page") return renderGenericCard();
  return renderShopCard(shareCardModel(result.props));
}
