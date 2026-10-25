"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { reencodeImage } from "@/lib/image";
import { requireRole } from "@/lib/require-role";
import { createEditorStore } from "@/lib/shop-editor-store";
import { createQrStore } from "@/lib/qr-store";
import { createShopActionsStore } from "@/lib/shop-actions-store";
import { createImageStore } from "@/lib/storage";
import { changeShopStatus, undoChange } from "@/services/shop-actions";
import { publishShop, saveDraft, type SaveResult } from "@/services/shop-editor";
import { MAX_UPLOAD_BYTES, saveShopImage, type UploadResult } from "@/services/storage";

// Thin on purpose: role check first, then the service. A viewer's call throws
// in requireRole before anything is read or written.

async function run(
  id: string | null,
  input: unknown,
  action: typeof saveDraft,
): Promise<SaveResult> {
  const user = await requireRole("admin");
  if (id !== null && !z.uuid().safeParse(id).success) return { ok: false, error: "Unknown shop." };
  try {
    const result = await action(createEditorStore(getDb()), id, input, user.email);
    if (result.ok) {
      revalidatePath("/admin/shops");
      revalidatePath(`/admin/shops/${result.id}`);
    }
    return result;
  } catch (error) {
    console.error("shop editor save failed", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function saveShopDraft(id: string | null, input: unknown): Promise<SaveResult> {
  return run(id, input, saveDraft);
}

export async function publishShopPage(id: string | null, input: unknown): Promise<SaveResult> {
  return run(id, input, publishShop);
}

export async function uploadShopImage(formData: FormData): Promise<UploadResult> {
  await requireRole("admin");
  const file = formData.get("file");
  const kind = formData.get("kind");
  const shopId = formData.get("shopId");
  if (!(file instanceof File)) return { ok: false, error: "Choose an image file." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `The image is too large. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  }
  const id = typeof shopId === "string" && z.uuid().safeParse(shopId).success ? shopId : null;
  try {
    return await saveShopImage(
      { store: createImageStore(), reencode: reencodeImage, randomId: () => randomUUID().slice(0, 8) },
      { shopId: id, kind: kind as "logo" | "cover", bytes: new Uint8Array(await file.arrayBuffer()) },
    );
  } catch (error) {
    console.error("image upload failed", error);
    return { ok: false, error: "Could not save the image. Try again." };
  }
}

// ---- Status and Undo (slice 5) ----------------------------------------------

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function changeShopStatusAction(shopId: unknown, op: unknown): Promise<SimpleResult> {
  const user = await requireRole("admin");
  const id = z.uuid().safeParse(shopId);
  const o = z.enum(["pause", "resume", "archive", "restore", "golive"]).safeParse(op);
  if (!id.success || !o.success) return { ok: false, error: "Unknown shop." };
  const result = await changeShopStatus(createShopActionsStore(getDb()), id.data, o.data, user.email);
  if (result.ok) {
    revalidatePath("/admin/shops");
    revalidatePath(`/admin/shops/${id.data}`);
  }
  return result;
}

export async function undoShopChange(shopId: unknown, changeId: unknown): Promise<SimpleResult> {
  const user = await requireRole("admin");
  const s = z.uuid().safeParse(shopId);
  const c = z.uuid().safeParse(changeId);
  if (!s.success || !c.success) return { ok: false, error: "Unknown change." };
  const db = getDb();
  try {
    const result = await undoChange(
      { store: createShopActionsStore(db), qr: createQrStore(db) },
      s.data,
      c.data,
      user.email,
    );
    if (result.ok) {
      revalidatePath("/admin/shops");
      revalidatePath("/admin/qr");
      revalidatePath(`/admin/shops/${s.data}`);
    }
    return result;
  } catch (error) {
    console.error("undo failed", error);
    return { ok: false, error: "Could not undo. Try again." };
  }
}
