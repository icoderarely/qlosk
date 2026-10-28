import { getDb } from "@/lib/db";
import { exportAllShops } from "@/lib/export-store";
import { requireRole } from "@/lib/require-role";

// All shop data as one JSON file. The owner's contact notes are in it, so it is
// for admins only.
export async function GET() {
  await requireRole("admin");
  const data = await exportAllShops(getDb());
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="shop-data-${data.exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
