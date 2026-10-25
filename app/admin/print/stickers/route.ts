import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { loadPrintFonts, qrBaseUrl } from "@/lib/print-assets";
import { createPrintFileLog } from "@/lib/print-store";
import { createQrStore } from "@/lib/qr-store";
import { getCurrentUser, requireRole } from "@/lib/require-role";
import { createFileStorage } from "@/lib/storage";
import { QrCheckError } from "@/services/print";
import { canDownloadPrintFiles, downloadStickerSheet } from "@/services/print-files";
import { parseCodeList } from "@/services/qr";

// A4 PDF of the 7 x 7 cm stickers for ?codes=A,B,C, 6 to a page with crop marks, in
// the order given. Codes may be in stock or assigned; unknown and retired ones are
// refused. Every QR is read back from the finished PDF before it is saved or sent.
export async function GET(request: Request) {
  await requireRole("viewer");
  const user = await getCurrentUser();
  if (!user || !canDownloadPrintFiles(user.role)) {
    return new Response("Your role cannot download print files.", { status: 403 });
  }
  const parsed = parseCodeList(new URL(request.url).searchParams.get("codes"));
  if (!parsed.ok) return new Response(parsed.error, { status: 400 });

  try {
    const found = await createQrStore(getDb()).findMany(parsed.codes);
    const usable = new Set(found.filter((c) => c.status !== "retired").map((c) => c.code));
    const missing = parsed.codes.filter((c) => !usable.has(c));
    if (missing.length > 0) return new Response(`These codes are unknown or retired: ${missing.slice(0, 5).join(", ")}`, { status: 404 });

    const [fonts, settings] = await Promise.all([loadPrintFonts(), loadSettings()]);
    const file = await downloadStickerSheet(
      { fonts, storage: createFileStorage(), log: createPrintFileLog(getDb()) },
      { codes: parsed.codes, baseUrl: qrBaseUrl(settings.domain.qrBase), userEmail: user.email },
    );
    return new Response(Buffer.from(file.bytes), {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="${file.fileName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("sticker sheet failed", error);
    return new Response(error instanceof QrCheckError ? error.message : "Could not make the sheet. Nothing was saved.", { status: 500 });
  }
}
