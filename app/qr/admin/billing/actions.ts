"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBillingStore } from "@/lib/billing-store";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { changePlan, markPaid, savePrices, undoPaid } from "@/services/billing";

// Thin on purpose: role check first, then the service. A viewer's call throws
// in requireRole before anything is read or written.

export type BillingActionResult = { ok: true; message: string } | { ok: false; error: string };

function refresh() {
  revalidatePath("/qr/admin/billing");
  revalidatePath("/qr/admin");
  revalidatePath("/qr/admin/shops");
}

export async function markShopPaid(shopId: unknown): Promise<BillingActionResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  if (!id.success) return { ok: false, error: "Choose a shop." };
  const result = await markPaid(createBillingStore(getDb()), id.data, user.email);
  if (result.ok) {
    refresh();
    revalidatePath(`/qr/admin/shops/${id.data}`);
  }
  return result;
}

const PlanChoice = z.union([
  z.object({ planId: z.uuid() }),
  z.object({ custom: z.object({ months: z.number(), rupees: z.string().max(20) }) }),
]);

export async function changeShopPlan(shopId: unknown, choice: unknown): Promise<BillingActionResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  const pick = PlanChoice.safeParse(choice);
  if (!id.success || !pick.success) return { ok: false, error: "Choose a plan." };
  const result = await changePlan(createBillingStore(getDb()), id.data, pick.data, user.email);
  if (result.ok) {
    refresh();
    revalidatePath(`/qr/admin/shops/${id.data}`);
  }
  return result;
}

export async function undoShopPaid(shopId: unknown): Promise<BillingActionResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  if (!id.success) return { ok: false, error: "Choose a shop." };
  const result = await undoPaid(createBillingStore(getDb()), id.data, user.email);
  if (result.ok) {
    refresh();
    revalidatePath(`/qr/admin/shops/${id.data}`);
  }
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
