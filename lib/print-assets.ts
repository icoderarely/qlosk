import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { FACE_FILES, type FaceId } from "@/components/standee/faces";
import type { PrintFonts } from "@/services/print";

// Fonts live in assets/fonts (Fraunces, Manrope, DM Sans, Nunito and Noto Sans
// Devanagari, SIL OFL, licences alongside). next.config.ts includes them in the
// print routes' bundle. The PDF wants the bytes; the PNG renderer wants paths.
const dir = () => path.join(process.cwd(), "assets", "fonts");

let fonts: Promise<PrintFonts> | null = null;
export function loadPrintFonts(): Promise<PrintFonts> {
  if (fonts) return fonts;
  const load = (async (): Promise<PrintFonts> => {
    const ids = Object.keys(FACE_FILES) as FaceId[];
    const files = ids.map((id) => path.join(dir(), FACE_FILES[id]));
    const loaded = await Promise.all(files.map((f) => readFile(f)));
    return {
      bytes: Object.fromEntries(ids.map((id, i) => [id, new Uint8Array(loaded[i])])) as PrintFonts["bytes"],
      files,
    };
  })();
  load.catch(() => {
    fonts = null;
  });
  fonts = load;
  return fonts;
}

// The domain printed into every code: the QR address saved in Settings, else
// QR_BASE_URL. Production must have one of them: a code printed with the wrong
// address cannot be fixed. Development falls back to the local address so the
// files can be tried.
export function qrBaseUrl(saved?: string): string {
  if (saved?.trim()) return saved.trim();
  const set = process.env.QR_BASE_URL?.trim();
  if (set) return set;
  if (process.env.NODE_ENV === "production") throw new Error("The QR address is not set. Add it in Settings or set QR_BASE_URL.");
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

const MAX_LOGO_BYTES = 6 * 1024 * 1024;

/** The shop's logo as PNG bytes, or null when there is none or it cannot be read. */
export async function loadLogoPng(logoUrl: string | null): Promise<Uint8Array | null> {
  if (!logoUrl) return null;
  try {
    let bytes: Uint8Array;
    if (logoUrl.startsWith("/uploads/")) {
      // Development storage (lib/storage.ts); keep the path inside public/uploads.
      const root = path.join(process.cwd(), "public", "uploads");
      const file = path.join(process.cwd(), "public", logoUrl);
      if (!file.startsWith(root + path.sep)) return null;
      bytes = await readFile(file);
    } else if (/^https:\/\//.test(logoUrl)) {
      const res = await fetch(logoUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length > MAX_LOGO_BYTES) return null;
      bytes = buf;
    } else return null;
    return await sharp(bytes).rotate().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } catch {
    return null;
  }
}
