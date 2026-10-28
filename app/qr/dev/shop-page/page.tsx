import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShopPage } from "@/components/shop-page/shop-page";
import {
  SAMPLE_BANNER,
  SAMPLE_OFFER,
  SAMPLE_SHOP,
  SAMPLE_WIFI,
  sampleLinks,
} from "@/components/shop-page/sample";
import {
  FONT_IDS,
  LAYOUT_IDS,
  THEME_IDS,
  type FontId,
} from "@/components/shop-page/types";

// Temporary gallery for slice 2. Remove once the playground (slice 3) exists.
export const metadata: Metadata = {
  title: "ShopPage gallery",
  robots: { index: false, follow: false },
};

export default function DevShopPage({ searchParams }: PageProps<"/qr/dev/shop-page">) {
  return (
    <main className="min-h-dvh bg-neutral-100 p-6 text-neutral-900">
      <Suspense fallback={<p>Loading…</p>}>
        <Gallery searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Gallery({
  searchParams,
}: {
  searchParams: PageProps<"/qr/dev/shop-page">["searchParams"];
}) {
  const params = await searchParams;
  const fontParam = typeof params.font === "string" ? params.font : "";
  const font: FontId = (FONT_IDS as readonly string[]).includes(fontParam)
    ? (fontParam as FontId)
    : "clean";
  const banner = params.banner === "1";

  return (
    <>
      <h1 className="m-0 text-2xl font-bold">ShopPage gallery</h1>
      <p className="mt-1 text-neutral-700">
        Every theme and layout on the sample shop from the design file. Font:{" "}
        <strong>{font}</strong>.
      </p>
      <nav aria-label="Options" className="mt-3 flex flex-wrap gap-2">
        {FONT_IDS.map((f) => (
          <Link
            key={f}
            href={`/qr/dev/shop-page?font=${f}${banner ? "&banner=1" : ""}`}
            aria-current={f === font ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-lg border border-neutral-400 bg-white px-4 font-semibold aria-[current=page]:bg-neutral-900 aria-[current=page]:text-white"
          >
            {f}
          </Link>
        ))}
        <Link
          href={`/qr/dev/shop-page?font=${font}${banner ? "" : "&banner=1"}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-neutral-400 bg-white px-4 font-semibold"
        >
          {banner ? "Hide banner" : "Show banner"}
        </Link>
      </nav>

      {THEME_IDS.map((theme) => (
        <section key={theme} aria-label={theme} className="mt-8">
          <h2 className="mb-3 text-lg font-bold capitalize">{theme}</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {LAYOUT_IDS.map((layout) => (
              <figure key={layout} className="m-0 flex-none">
                <figcaption className="mb-2 text-sm font-semibold">
                  {theme} / {layout}
                </figcaption>
                <div
                  className="w-[390px] overflow-hidden rounded-2xl border border-neutral-300"
                  style={{ "--page-min-h": "860px" } as React.CSSProperties}
                >
                  <ShopPage
                    theme={theme}
                    layout={layout}
                    font={font}
                    shop={SAMPLE_SHOP}
                    links={sampleLinks(layout)}
                    offer={SAMPLE_OFFER}
                    wifi={SAMPLE_WIFI}
                    banner={banner ? SAMPLE_BANNER : null}
                  />
                </div>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
