"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createRollupStore } from "@/lib/rollup-store";
import { createReviewStore } from "@/lib/spike-review-store";
import { reviewSpike } from "@/services/spike-review";

export type ReviewActionResult = { ok: true; message: string } | { ok: false; error: string };

// Count them / Mark as bots. Thin on purpose: role check, then the service.
export async function reviewUnusualTraffic(shopId: unknown, decision: unknown): Promise<ReviewActionResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  if (!id.success) return { ok: false, error: "Choose a shop." };
  const db = getDb();
  const result = await reviewSpike(createReviewStore(db), createRollupStore(db), id.data, decision, user.email);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/shops");
  return result;
}
