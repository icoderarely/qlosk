import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { loadLogoPng, loadPrintFonts, qrBaseUrl } from "@/lib/print-assets";
import { createPrintFileLog } from "@/lib/print-store";
import { getCurrentUser, requireRole } from "@/lib/require-role";
import { createEditorStore } from "@/lib/shop-editor-store";
import { createFileStorage } from "@/lib/storage";
import { QrCheckError } from "@/services/print";
import { canDownloadPrintFiles, downloadStandee } from "@/services/print-files";
import { getShopEditor } from "@/services/shop-editor";
import { parseChoices } from "@/services/standee";

// Shared by /admin/shops/[id]/standee.pdf and .png: check the role, work out the
// choices, then let the service build, check, save and log the file. Thin on
// purpose; the rules are in services/print-files.ts.
export async function standeeResponse(kind: "pdf" | "png", request: Request, idParam: string): Promise<Response> {
  await requireRole("viewer"); // signed out goes to the login page
  const user = await getCurrentUser();
  if (!user || !canDownloadPrintFiles(user.role)) {
    return new Response("Your role cannot download print files.", { status: 403 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(idParam)) return new Response("Not found", { status: 404 });

  const db = getDb();
  const data = await getShopEditor(createEditorStore(db), idParam);
  if (!data || !data.id) return new Response("Not found", { status: 404 });
  if (!data.code) return new Response("This shop has no QR code assigned.", { status: 409 });

  // The editor passes what is on screen; without it the saved choices are used.
  const q = new URL(request.url).searchParams;
  let choices = data.standee;
  if (q.has("design")) {
    const parsed = parseChoices({
      design: q.get("design"),
      theme: q.get("theme"),
      headline: q.get("headline") ?? "",
      size: q.get("size"),
    });
    if (!parsed.ok) return new Response(parsed.error, { status: 400 });
    choices = parsed.value;
  }

  try {
    const baseUrl = qrBaseUrl((await loadSettings()).domain.qrBase);
    const [fonts, logo] = await Promise.all([loadPrintFonts(), loadLogoPng(data.values.details.logoUrl || null)]);
    const file = await downloadStandee(
      { fonts, storage: createFileStorage(), log: createPrintFileLog(db) },
      {
        kind,
        shop: { id: data.id, code: data.code, values: data.values },
        choices,
        baseUrl,
        userEmail: user.email,
        logoSrc: logo ? `data:image/png;base64,${Buffer.from(logo).toString("base64")}` : null,
      },
    );
    return new Response(Buffer.from(file.bytes), {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="${file.fileName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    // Fail loudly: a file that did not pass the QR check, or could not be saved, is never sent.
    console.error("standee download failed", error);
    const text = error instanceof QrCheckError ? error.message : "Could not make the file. Nothing was saved.";
    return new Response(text, { status: 500 });
  }
}
