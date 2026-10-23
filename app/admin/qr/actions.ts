"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createQrStore } from "@/lib/qr-store";
import { assignCode, generateBatch, reassignCode, retireCode } from "@/services/qr";

// Thin on purpose: role check first, then the service. A viewer's call throws
// in requireRole before anything is read or written.

export type QrActionResult = { ok: true; message: string } | { ok: false; error: string };

const codeSchema = z.string().min(1).max(20);
const idSchema = z.uuid();

function refresh(shopId?: string) {
  revalidatePath("/admin/qr");
  revalidatePath("/admin/shops");
  if (shopId) revalidatePath(`/admin/shops/${shopId}`);
}

export async function generateQrBatch(count: unknown): Promise<QrActionResult> {
  await requireRole("admin");
  const result = await generateBatch(createQrStore(getDb()), count);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: `Made ${result.count} codes (batch ${result.batchId}).` };
}

export async function assignQrCode(code: unknown, shopId: unknown): Promise<QrActionResult> {
  const user = await requireRole("admin");
  const c = codeSchema.safeParse(code);
  const s = idSchema.safeParse(shopId);
  if (!c.success || !s.success) return { ok: false, error: "Choose a code and a shop." };
  const result = await assignCode(createQrStore(getDb()), c.data, s.data, user.email);
  if (!result.ok) return result;
  refresh(s.data);
  return { ok: true, message: "Code assigned." };
}

export async function reassignQrCode(code: unknown, toShopId: unknown): Promise<QrActionResult> {
  const user = await requireRole("admin");
  const c = codeSchema.safeParse(code);
  const s = idSchema.safeParse(toShopId);
  if (!c.success || !s.success) return { ok: false, error: "Choose a code and a shop." };
  const result = await reassignCode(createQrStore(getDb()), c.data, s.data, user.email);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Code moved to the new shop." };
}

export async function retireQrCode(code: unknown): Promise<QrActionResult> {
  const user = await requireRole("admin");
  const c = codeSchema.safeParse(code);
  if (!c.success) return { ok: false, error: "Choose a code." };
  const result = await retireCode(createQrStore(getDb()), c.data, user.email);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: "Code retired. It will never be used again." };
}
