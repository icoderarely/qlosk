import localFont from "next/font/local";
import type { FaceMap } from "./faces";

// The standee's fonts for the browser, loaded from the same files the PDF and PNG
// embed (assets/fonts), so the preview draws the same letters. They load only
// when a glyph is used. (A font loader must be called in the module scope with
// literal options, so each face is spelled out.)
const fraunces = localFont({ src: "../../assets/fonts/Fraunces-Bold.ttf", weight: "700", display: "swap", preload: false });
const manrope600 = localFont({ src: "../../assets/fonts/Manrope-SemiBold.ttf", weight: "600", display: "swap", preload: false });
const manrope800 = localFont({ src: "../../assets/fonts/Manrope-ExtraBold.ttf", weight: "800", display: "swap", preload: false });
const dmSans400 = localFont({ src: "../../assets/fonts/DMSans-Regular.ttf", weight: "400", display: "swap", preload: false });
const dmSans700 = localFont({ src: "../../assets/fonts/DMSans-Bold.ttf", weight: "700", display: "swap", preload: false });
const nunito400 = localFont({ src: "../../assets/fonts/Nunito-Regular.ttf", weight: "400", display: "swap", preload: false });
const nunito700 = localFont({ src: "../../assets/fonts/Nunito-Bold.ttf", weight: "700", display: "swap", preload: false });
const indic400 = localFont({ src: "../../assets/fonts/NotoSansDevanagari-Regular.ttf", weight: "400", display: "swap", preload: false });
const indic700 = localFont({ src: "../../assets/fonts/NotoSansDevanagari-Bold.ttf", weight: "700", display: "swap", preload: false });

export const PREVIEW_FACES: FaceMap = {
  fraunces700: { family: fraunces.style.fontFamily, weight: 700 },
  manrope600: { family: manrope600.style.fontFamily, weight: 600 },
  manrope800: { family: manrope800.style.fontFamily, weight: 800 },
  dmsans400: { family: dmSans400.style.fontFamily, weight: 400 },
  dmsans700: { family: dmSans700.style.fontFamily, weight: 700 },
  nunito400: { family: nunito400.style.fontFamily, weight: 400 },
  nunito700: { family: nunito700.style.fontFamily, weight: 700 },
  indic400: { family: indic400.style.fontFamily, weight: 400 },
  indic700: { family: indic700.style.fontFamily, weight: 700 },
};
