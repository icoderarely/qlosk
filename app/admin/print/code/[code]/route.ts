import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { qrBaseUrl } from "@/lib/print-assets";
import { createQrStore } from "@/lib/qr-store";
import { requireRole } from "@/lib/require-role";
import { qrSvg, qrTarget } from "@/services/print";
import { isValidCode, normalizeCode } from "@/services/qr";

// SVG for one code that has no shop yet, so it can be printed or sent to a
// sticker maker. Assigned codes download from the shop route instead.
export async function GET(_request: Request, ctx: RouteContext<"/admin/print/code/[code]">) {
  await requireRole("viewer");
  const code = normalizeCode((await ctx.params).code);
  if (!isValidCode(code)) return new Response("Not found", { status: 404 });
  const record = await createQrStore(getDb()).find(code);
  if (!record || record.status !== "unassigned") return new Response("Not found", { status: 404 });

  const base = qrBaseUrl((await loadSettings()).domain.qrBase);
  return new Response(qrSvg(qrTarget(base, code)), {
    headers: {
      "content-type": "image/svg+xml",
      "content-disposition": `attachment; filename="qr-${code}.svg"`,
      "cache-control": "private, no-store",
    },
  });
}
