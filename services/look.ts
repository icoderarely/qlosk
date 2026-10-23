// Look rules shared by the editor, the save check and the public page.
// No Next.js imports; relative imports only so node --test loads it.
import { contrastRatio, MIN_TEXT_CONTRAST } from "../lib/contrast.ts";
import { THEMES } from "../components/shop-page/themes.ts";
import type { ThemeId } from "../components/shop-page/types.ts";

export type ButtonColorCheck = { ok: boolean; ratio: number; min: number };

// Spec section 5: button text on the button colour must reach 4.5:1. The text
// colour comes from the theme, so the same colour can pass on one theme and fail
// on another.
export function checkButtonColor(theme: ThemeId, hex: string): ButtonColorCheck {
  const ratio = contrastRatio(THEMES[theme].btntext, hex);
  return { ok: ratio >= MIN_TEXT_CONTRAST, ratio, min: MIN_TEXT_CONTRAST };
}

/** "3.1 to 1, below the 4.5 to 1 needed" - why a colour was blocked. */
export function contrastReason(check: ButtonColorCheck): string {
  return `contrast is ${check.ratio.toFixed(1)}:1, below the ${check.min}:1 needed to read the button text`;
}
