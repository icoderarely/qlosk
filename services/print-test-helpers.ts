// Shared by the print tests: the real font files, and a shop to print.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FACE_FILES, type FaceId } from "../components/standee/faces.ts";
import type { PrintFonts } from "./print.ts";
import { type EditorValues, newShopValues } from "./shop-editor.ts";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");

let cached: Promise<PrintFonts> | null = null;
export function testFonts(): Promise<PrintFonts> {
  cached ??= (async () => {
    const ids = Object.keys(FACE_FILES) as FaceId[];
    const files = ids.map((id) => path.join(dir, FACE_FILES[id]));
    const loaded = await Promise.all(files.map((f) => readFile(f)));
    return {
      bytes: Object.fromEntries(ids.map((id, i) => [id, new Uint8Array(loaded[i])])) as PrintFonts["bytes"],
      files,
    };
  })();
  return cached;
}

export const BASE = "https://qlosk.com";

/** A test shop with every button filled in. */
export function testShop(over: Partial<EditorValues["details"]> = {}, font: "editorial" | "clean" | "rounded" = "editorial"): EditorValues {
  const v = newShopValues();
  v.details = {
    ...v.details,
    name: "Velvet Salon & Spa",
    tagline: "Hair, skin and bridal studio",
    phone: "98200 12345",
    whatsapp: "98200 12345",
    ...over,
  };
  v.look = { theme: "blush", layout: "list", font };
  v.wifi = { enabled: true, network: "Velvet", password: "x" };
  v.links = v.links.map((l) =>
    l.type === "google_review" ? { ...l, target: "https://g.page/r/velvet/review" } :
    l.type === "maps" ? { ...l, target: "https://maps.google.com/?q=velvet" } :
    l.type === "instagram" ? { ...l, target: "https://instagram.com/velvet" } : l,
  );
  return v;
}
