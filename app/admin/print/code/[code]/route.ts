import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { loadPrintFonts, qrBaseUrl } from "@/lib/print-assets";
import { createQrStore } from "@/lib/qr-store";
import { requireRole } from "@/lib/require-role";
import { QrCheckError } from "@/services/print";
import { isValidCode, normalizeCode } from "@/services/qr";
import { buildStickerPng, stickerFileName } from "@/services/sticker";

// The 7 x 7 cm sticker PNG (600 dpi) for one code, in stock or assigned, for
// free-trial stickers and sticker makers. Retired codes are never printed again.
// The QR is read back from the picture before it is sent.
export async function GET(_request: Request, ctx: RouteContext<"/admin/print/code/[code]">) {
  await requireRole("viewer");
  const code = normalizeCode((await ctx.params).code);
  if (!isValidCode(code)) return new Response("Not found", { status: 404 });
  const record = await createQrStore(getDb()).find(code);
  if (!record || record.status === "retired") return new Response("Not found", { status: 404 });

  try {
    const base = qrBaseUrl((await loadSettings()).domain.qrBase);
    const png = await buildStickerPng(code, base, await loadPrintFonts());
    return new Response(Buffer.from(png), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `attachment; filename="${stickerFileName(code)}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("sticker download failed", error);
    return new Response(error instanceof QrCheckError ? error.message : "Could not make the file.", { status: 500 });
  }
}
