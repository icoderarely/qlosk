"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/require-role";
import { createShopsStore } from "@/lib/shops-store";
import { bulkUpdateLook, type BulkLookResult } from "@/services/shops";

// Thin on purpose: check the role, hand the input to the service, refresh the
// list. A viewer's call throws in requireRole before anything is read.
export async function bulkChangeLook(input: unknown): Promise<BulkLookResult> {
  const user = await requireRole("admin");
  const result = await bulkUpdateLook(createShopsStore(getDb()), input, user.email);
  if (result.ok) revalidatePath("/qr/admin/shops");
  return result;
}
