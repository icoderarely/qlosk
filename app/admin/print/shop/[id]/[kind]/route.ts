import { getDb } from "@/lib/db";
import { loadLogoPng, loadPrintFonts, qrBaseUrl } from "@/lib/print-assets";
import { shopForPrint } from "@/lib/print-store";
import { requireRole } from "@/lib/require-role";
import { buildShopPrint, printFileName, qrSvg, qrTarget } from "@/services/print";

// Download for one shop's QR: A5 standee, 4x6 card or the bare SVG. Any signed-in
// admin account may download; the file only contains what is already printed.
export async function GET(_request: Request, ctx: RouteContext<"/admin/print/shop/[id]/[kind]">) {
  await requireRole("viewer");
  const { id, kind } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || (kind !== "a5" && kind !== "card" && kind !== "svg")) {
    return new Response("Not found", { status: 404 });
  }
  const shop = await shopForPrint(getDb(), id);
  if (!shop) return new Response("This shop has no QR code assigned.", { status: 404 });

  const base = qrBaseUrl();
  const headers = {
    "cache-control": "private, no-store",
    "content-disposition": `attachment; filename="${printFileName(kind, shop.code)}"`,
  };
  if (kind === "svg") {
    return new Response(qrSvg(qrTarget(base, shop.code)), { headers: { ...headers, "content-type": "image/svg+xml" } });
  }
  const [fonts, logo] = await Promise.all([loadPrintFonts(), loadLogoPng(shop.logoUrl)]);
  const pdf = await buildShopPrint(kind, { name: shop.name, code: shop.code, logo }, base, fonts);
  return new Response(Buffer.from(pdf), { headers: { ...headers, "content-type": "application/pdf" } });
}
