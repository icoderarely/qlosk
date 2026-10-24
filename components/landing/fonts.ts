import { Fraunces, Manrope } from "next/font/google";

// Headings and text for the landing page (spec section 10). Weights match
// docs/design/LandingV2.dc.html; the italic is the yellow word in the hero.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-l-serif",
  weight: ["700"],
  style: ["normal", "italic"],
  display: "swap",
  adjustFontFallback: true,
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-l-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: true,
});

/** Class for the landing page root: defines both font variables. */
export const LANDING_FONTS = `${fraunces.variable} ${manrope.variable}`;
