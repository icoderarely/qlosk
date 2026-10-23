// Logo and cover uploads (spec section 8: images only, size limit, re-encoded
// on the server). The bytes are checked by content, not by the file name or
// the type the browser claims, then re-encoded, which also strips metadata such
// as GPS position. Storage itself sits behind ImageStore (lib/storage.ts).
// No Next.js imports.

export type ImageKind = "logo" | "cover";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type ImageStore = {
  /** Saves the file and returns the URL the public page will use. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<string>;
};

/** Turns any accepted image into the stored format, resized for its use. */
export type Reencode = (bytes: Uint8Array, kind: ImageKind) => Promise<Uint8Array>;

export const STORED_CONTENT_TYPE = "image/webp";

// First bytes of the formats we accept.
export function sniffImage(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpeg";
  if (
    bytes.length >= 8 &&
    at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a
  ) {
    return "png";
  }
  const ascii = (from: number, text: string) =>
    [...text].every((c, i) => at(from + i) === c.charCodeAt(0));
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  return null;
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function saveShopImage(
  deps: { store: ImageStore; reencode: Reencode; randomId: () => string },
  input: { shopId: string | null; kind: ImageKind; bytes: Uint8Array },
): Promise<UploadResult> {
  if (input.kind !== "logo" && input.kind !== "cover") {
    return { ok: false, error: "Unknown image type." };
  }
  if (input.bytes.length === 0) return { ok: false, error: "Choose an image file." };
  if (input.bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `The image is too large. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  }
  if (!sniffImage(input.bytes)) {
    return { ok: false, error: "Use a JPEG, PNG or WebP image." };
  }
  let encoded: Uint8Array;
  try {
    encoded = await deps.reencode(input.bytes, input.kind);
  } catch {
    return { ok: false, error: "That file could not be read as an image." };
  }
  const key = `shops/${input.shopId ?? "new"}/${input.kind}-${deps.randomId()}.webp`;
  const url = await deps.store.put(key, encoded, STORED_CONTENT_TYPE);
  return { ok: true, url };
}
