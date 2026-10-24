import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { loadPrintFonts, qrBaseUrl } from "@/lib/print-assets";
import { createQrStore } from "@/lib/qr-store";
import { requireRole } from "@/lib/require-role";
import { MAX_BATCH } from "@/services/qr";
import { buildCodeSheet, parseStickerSize } from "@/services/print";

// PDF sheet of the codes still in stock, for the chosen sticker size.
export async function GET(request: Request) {
  await requireRole("viewer");
  const size = parseStickerSize(new URL(request.url).searchParams.get("size"));
  const [codes, fonts, settings] = await Promise.all([
    createQrStore(getDb()).stock(MAX_BATCH),
    loadPrintFonts(),
    loadSettings(),
  ]);
  const pdf = await buildCodeSheet(size, codes, qrBaseUrl(settings.domain.qrBase), fonts);
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="unassigned-codes-${size}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
