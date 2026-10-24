// The font files the standee uses and how each is named where it is drawn.
// Fonts follow the shop page font (spec section 11); the credit line is always
// Manrope and Fraunces. Files are in assets/fonts (SIL OFL, licences alongside).
import type { FontId } from "../shop-page/types.ts";

export const FACE_IDS = [
  "fraunces700",
  "manrope600",
  "manrope800",
  "dmsans400",
  "dmsans700",
  "nunito400",
  "nunito700",
  "indic400",
  "indic700",
] as const;
export type FaceId = (typeof FACE_IDS)[number];

export const FACE_FILES: Record<FaceId, string> = {
  fraunces700: "Fraunces-Bold.ttf",
  manrope600: "Manrope-SemiBold.ttf",
  manrope800: "Manrope-ExtraBold.ttf",
  dmsans400: "DMSans-Regular.ttf",
  dmsans700: "DMSans-Bold.ttf",
  nunito400: "Nunito-Regular.ttf",
  nunito700: "Nunito-Bold.ttf",
  indic400: "NotoSansDevanagari-Regular.ttf",
  indic700: "NotoSansDevanagari-Bold.ttf",
};

/** How a face is written into the SVG: font-family and font-weight. */
export type FaceStyle = { family: string; weight: number };
export type FaceMap = Record<FaceId, FaceStyle>;

/**
 * Names as the font files themselves report them, which is what the PNG
 * renderer and the PDF writer look fonts up by. (Manrope's static files carry
 * the weight in the family name.)
 */
export const FILE_FACES: FaceMap = {
  fraunces700: { family: "Fraunces", weight: 700 },
  manrope600: { family: "Manrope SemiBold", weight: 400 },
  manrope800: { family: "Manrope ExtraBold", weight: 400 },
  dmsans400: { family: "DM Sans", weight: 400 },
  dmsans700: { family: "DM Sans", weight: 700 },
  nunito400: { family: "Nunito", weight: 400 },
  nunito700: { family: "Nunito", weight: 700 },
  indic400: { family: "Noto Sans Devanagari", weight: 400 },
  indic700: { family: "Noto Sans Devanagari", weight: 700 },
};

export type FacePack = { head: FaceId; body: FaceId; bodyBold: FaceId };

export const FACE_PACKS: Record<FontId, FacePack> = {
  editorial: { head: "fraunces700", body: "dmsans400", bodyBold: "dmsans700" },
  clean: { head: "dmsans700", body: "dmsans400", bodyBold: "dmsans700" },
  rounded: { head: "nunito700", body: "nunito400", bodyBold: "nunito700" },
};

// Anything past Latin Extended-B, except general punctuation and the rupee
// sign, is shown in Devanagari so Hindi and Marathi names still print.
function needsIndic(text: string): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c > 0x24f && !(c >= 0x2000 && c <= 0x206f) && c !== 0x20b9) return true;
  }
  return false;
}

/** The face to draw `text` in: the asked-for face, or Devanagari when it has those letters. */
export function faceForText(face: FaceId, text: string): FaceId {
  if (!needsIndic(text)) return face;
  return face === "dmsans400" || face === "nunito400" ? "indic400" : "indic700";
}
