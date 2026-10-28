import type { Metadata } from "next";
import { THEME_IDS } from "@/components/shop-page/types";
import { CARD_HEIGHT, CARD_WIDTH, SAFE_LEFT, SAFE_RIGHT } from "@/services/share-card";

export const metadata: Metadata = {
  title: "Share card gallery",
  robots: { index: false, follow: false },
};

// Every theme's link-preview card, with a red wash over the parts outside the
// middle 880 px (x 160 to 1040) that chat apps may crop. Nothing may sit in red.
const VARIANTS = [
  { label: "Normal", query: "" },
  { label: "Long name (22 characters)", query: "&name=Velvet%20Salon%20and%20Spa%20Co" },
  { label: "Very long name (39 characters)", query: "&name=The%20Velvet%20Salon%20and%20Spa%20of%20Bandra%20West" },
  { label: "Only Call and Maps, no more", query: "&buttons=call,maps" },
  { label: "Rounded font", query: "&font=rounded" },
  { label: "Editorial font", query: "&font=editorial" },
];

export default function DevShareCard() {
  return (
    <main className="min-h-dvh bg-neutral-100 p-6 text-neutral-900">
      <h1 className="text-xl font-bold">Share card</h1>
      <p className="mt-1 text-sm text-neutral-700">{CARD_WIDTH} x {CARD_HEIGHT}. Red is outside x {SAFE_LEFT} to {SAFE_RIGHT}.</p>
      {THEME_IDS.map((theme) => (
        <section key={theme} className="mt-8">
          <h2 className="text-lg font-bold capitalize">{theme}</h2>
          <div className="mt-3 flex flex-wrap gap-6">
            {(theme === "daylight" ? VARIANTS : VARIANTS.slice(0, 1)).map((v) => (
              <figure key={v.label} className="m-0 w-[600px] max-w-full">
                <div className="relative aspect-[1200/630] overflow-hidden rounded border border-neutral-300">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dev gallery of generated PNGs */}
                  <img src={`/qr/dev/share-card/image?theme=${theme}${v.query}`} alt={`${theme} card, ${v.label}`} className="size-full" />
                  <div className="absolute inset-y-0 left-0 bg-red-600/35" style={{ width: `${(SAFE_LEFT / CARD_WIDTH) * 100}%` }} />
                  <div className="absolute inset-y-0 right-0 bg-red-600/35" style={{ width: `${((CARD_WIDTH - SAFE_RIGHT) / CARD_WIDTH) * 100}%` }} />
                </div>
                <figcaption className="mt-1 text-xs text-neutral-700">{v.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
