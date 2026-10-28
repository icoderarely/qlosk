import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { qrBaseUrl } from "@/lib/print-assets";
import { shopForPrint } from "@/lib/print-store";
import { requireRole } from "@/lib/require-role";
import { qrSvg, qrTarget } from "@/services/print";

// The bare QR of one shop as an SVG, for a sticker maker. The standee files are
// made on /admin/shops/[id]/standee.pdf and .png. Any signed-in admin account may
// download this; it only contains what is already printed.
export async function GET(_request: Request, ctx: RouteContext<"/qr/admin/print/shop/[id]/[kind]">) {
  await requireRole("viewer");
  const { id, kind } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || kind !== "svg") return new Response("Not found", { status: 404 });
  const shop = await shopForPrint(getDb(), id);
  if (!shop) return new Response("This shop has no QR code assigned.", { status: 404 });

  const base = qrBaseUrl((await loadSettings()).domain.qrBase);
  return new Response(qrSvg(qrTarget(base, shop.code)), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="qr-${shop.code}.svg"`,
      "content-type": "image/svg+xml",
    },
  });
}
