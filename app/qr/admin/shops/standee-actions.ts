"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { loadSettings } from "@/lib/load-settings";
import { loadLogoPng, loadPrintFonts, qrBaseUrl } from "@/lib/print-assets";
import { createStandeeStore } from "@/lib/print-store";
import { requireRole } from "@/lib/require-role";
import { createEditorStore } from "@/lib/shop-editor-store";
import { QrCheckError, checkStandeeQr } from "@/services/print";
import { buildQrArt, qrTarget } from "@/services/qr-art";
import { getShopEditor } from "@/services/shop-editor";
import { parseChoices, saveStandeeChoices, standeeInput } from "@/services/standee";

// Thin on purpose: role check, validate, call the service.

export type StandeeSaveResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveStandee(shopId: unknown, input: unknown): Promise<StandeeSaveResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  if (!id.success) return { ok: false, error: "Unknown shop." };
  try {
    const result = await saveStandeeChoices(createStandeeStore(getDb()), id.data, input, user.email);
    if (!result.ok) return result;
    revalidatePath(`/qr/admin/shops/${id.data}`);
    return { ok: true, message: "Standee choices saved." };
  } catch (error) {
    console.error("standee save failed", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export type StandeeCheckResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Renders this shop's standee on the server, reads the QR back out of the image and
 * says whether it opens the right address. The preview shows "QR checked" only on ok.
 */
export async function checkStandee(shopId: unknown, input: unknown): Promise<StandeeCheckResult> {
  await requireRole("viewer");
  const id = z.uuid().safeParse(shopId);
  const choices = parseChoices(input);
  if (!id.success || !choices.ok) return { ok: false, error: "Unknown shop." };
  try {
    const db = getDb();
    const data = await getShopEditor(createEditorStore(db), id.data);
    if (!data?.code) return { ok: false, error: "This shop has no QR code assigned." };
    const base = qrBaseUrl((await loadSettings()).domain.qrBase);
    const art = buildQrArt(qrTarget(base, data.code));
    const [fonts, logo] = await Promise.all([loadPrintFonts(), loadLogoPng(data.values.details.logoUrl || null)]);
    const logoSrc = logo ? `data:image/png;base64,${Buffer.from(logo).toString("base64")}` : null;
    await checkStandeeQr(standeeInput(data.values, choices.value, art, logoSrc), fonts);
    return { ok: true, url: art.url };
  } catch (error) {
    console.error("standee QR check failed", error);
    return { ok: false, error: error instanceof QrCheckError ? error.message : "The QR check could not run." };
  }
}
