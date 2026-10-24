"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBillingStore } from "@/lib/billing-store";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { markPaid, savePrices } from "@/services/billing";

// Thin on purpose: role check first, then the service. A viewer's call throws
// in requireRole before anything is read or written.

export type BillingActionResult = { ok: true; message: string } | { ok: false; error: string };

function refresh() {
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  revalidatePath("/admin/shops");
}

export async function markShopPaid(shopId: unknown): Promise<BillingActionResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  if (!id.success) return { ok: false, error: "Choose a shop." };
  const result = await markPaid(createBillingStore(getDb()), id.data, user.email);
  if (result.ok) refresh();
  return result;
}

export async function savePlanPrices(input: unknown): Promise<BillingActionResult> {
  const user = await requireRole("admin");
  const parsed = z.record(z.string(), z.string().max(20)).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the prices and try again." };
  const result = await savePrices(createBillingStore(getDb()), parsed.data, user.email);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: result.message ?? "Prices saved." };
}
