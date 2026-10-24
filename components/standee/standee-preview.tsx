"use client";

import { Standee, type StandeeProps } from "./standee";
import { PREVIEW_FACES } from "./preview-fonts";

// The standee in the browser: the same Standee component the print files are
// made from, with the fonts the page has loaded.
export function StandeePreview(props: Omit<StandeeProps, "faces" | "bleed" | "width" | "height">) {
  return <Standee {...props} faces={PREVIEW_FACES} />;
}
