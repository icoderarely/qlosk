"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { createOnboardingStore } from "@/lib/onboarding-store";
import { requireRole } from "@/lib/require-role";
import { createEditorStore } from "@/lib/shop-editor-store";
import { createLead, moveStage } from "@/services/onboarding";

// Thin on purpose: role check first, then the service. A viewer's call throws
// in requireRole before anything is read or written.

export type BoardActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function moveShopStage(shopId: unknown, stage: unknown): Promise<BoardActionResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  if (!id.success) return { ok: false, error: "Choose a shop." };
  const result = await moveStage(createOnboardingStore(getDb()), id.data, stage, user.email);
  if (!result.ok) return result;
  revalidatePath("/admin/onboarding");
  revalidatePath("/admin");
  return { ok: true, message: "Moved." };
}

export async function addLead(input: unknown): Promise<BoardActionResult> {
  const user = await requireRole("admin");
  const db = getDb();
  const result = await createLead(createEditorStore(db), createOnboardingStore(db), input, user.email);
  if (!result.ok) return result;
  revalidatePath("/admin/onboarding");
  revalidatePath("/admin/shops");
  return { ok: true, message: "Lead added." };
}
