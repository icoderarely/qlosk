import { standeeResponse } from "@/lib/standee-download";

// Print-ready standee for one shop. Admins only; the QR is checked before the file is saved or sent.
export async function GET(request: Request, ctx: RouteContext<"/admin/shops/[id]/standee.png">) {
  return standeeResponse("png", request, (await ctx.params).id);
}
