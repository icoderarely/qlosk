import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { loadPrintFonts, qrBaseUrl } from "@/lib/print-assets";
import { createPrintFileLog } from "@/lib/print-store";
import { createQrStore } from "@/lib/qr-store";
import { getCurrentUser, requireRole } from "@/lib/require-role";
import { createFileStorage } from "@/lib/storage";
import { QrCheckError, parseStickerSize } from "@/services/print";
import { canDownloadPrintFiles, downloadCodeSheet } from "@/services/print-files";
import { MAX_BATCH } from "@/services/qr";

// PDF sheet of the codes still in stock, for the chosen sticker size. Every code is
// read back from its own cell before the file is saved; the file is logged in
// print_files. Admins only, like the standee downloads.
export async function GET(request: Request) {
  await requireRole("viewer");
  const user = await getCurrentUser();
  if (!user || !canDownloadPrintFiles(user.role)) {
    return new Response("Your role cannot download print files.", { status: 403 });
  }
  const size = parseStickerSize(new URL(request.url).searchParams.get("size"));
  try {
    const [codes, fonts, settings] = await Promise.all([
      createQrStore(getDb()).stock(MAX_BATCH),
      loadPrintFonts(),
      loadSettings(),
    ]);
    const file = await downloadCodeSheet(
      { fonts, storage: createFileStorage(), log: createPrintFileLog(getDb()) },
      { size, codes, baseUrl: qrBaseUrl(settings.domain.qrBase), userEmail: user.email },
    );
    return new Response(Buffer.from(file.bytes), {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="${file.fileName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("code sheet failed", error);
    return new Response(error instanceof QrCheckError ? error.message : "Could not make the sheet. Nothing was saved.", {
      status: 500,
    });
  }
}
