"use server";

import { z } from "zod";
import { requireRole } from "@/lib/require-role";
import { quickSetup, type QuickSetupResult } from "@/services/quick-setup";

// Thin on purpose: role check, validate, call the service. Nothing is saved here;
// the editor applies the suggestions and saves through the usual draft path.
const input = z.object({ text: z.string().trim().min(1).max(2000), currentName: z.string().max(80) });

export async function lookupQuickSetup(raw: unknown): Promise<QuickSetupResult> {
  await requireRole("admin");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Paste at least one link." };
  return quickSetup(
    { fetch, apiKey: process.env.GOOGLE_PLACES_API_KEY || null },
    parsed.data.text,
    parsed.data.currentName,
  );
}
