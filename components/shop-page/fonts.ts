import { DM_Sans, Fraunces, Nunito } from "next/font/google";
import type { FontId } from "./types";

// Weights match docs/design/ShopPage.dc.html.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700"],
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

type FontPack = {
  /** Class that defines the next/font variables this pack needs. */
  className: string;
  head: string;
  body: string;
};

export const FONT_PACKS: Record<FontId, FontPack> = {
  editorial: {
    className: `${fraunces.variable} ${dmSans.variable}`,
    head: "var(--font-fraunces), Georgia, serif",
    body: "var(--font-dm-sans), system-ui, sans-serif",
  },
  clean: {
    className: dmSans.variable,
    head: "var(--font-dm-sans), system-ui, sans-serif",
    body: "var(--font-dm-sans), system-ui, sans-serif",
  },
  rounded: {
    className: nunito.variable,
    head: "var(--font-nunito), system-ui, sans-serif",
    body: "var(--font-nunito), system-ui, sans-serif",
  },
};
