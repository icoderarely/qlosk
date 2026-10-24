import type { Metadata } from "next";
import { Suspense } from "react";
import { PlaygroundSection } from "@/components/playground/playground-section";
import { parseLook } from "@/components/playground/look-url";
import { SAMPLES, SHOP_TYPE_IDS, type ShopTypeId } from "@/components/playground/samples";
import { LAYOUT_IDS, THEME_IDS } from "@/components/shop-page/types";
import { loadSettings } from "@/lib/load-settings";

export const metadata: Metadata = {
  title: "Try a look for your shop",
  description: "Try every theme, layout and font on a sample shop page.",
};

// Public, no login, nothing stored. The look comes from the URL and is
// rendered on the server; the client section keeps the URL up to date.
export default function PlaygroundPage({ searchParams }: PageProps<"/playground">) {
  return (
    <main className="min-h-dvh bg-neutral-50">
      <Suspense fallback={<p className="p-6 text-neutral-700">Loading…</p>}>
        <Playground searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Playground({
  searchParams,
}: {
  searchParams: PageProps<"/playground">["searchParams"];
}) {
  const [params, settings] = await Promise.all([searchParams, loadSettings()]);

  const themes = THEME_IDS.filter((t) => settings.enabledThemes[t]);
  const layouts = LAYOUT_IDS.filter((l) => settings.enabledLayouts[l]);

  // Suggested look per shop type comes from Settings.
  const suggestions: Partial<Record<ShopTypeId, { theme: (typeof THEME_IDS)[number]; layout: (typeof LAYOUT_IDS)[number] }>> = {};
  for (const id of SHOP_TYPE_IDS) {
    const s = settings.shopTypes.find((t) => t.label === SAMPLES[id].settingsType)?.suggested;
    if (s) suggestions[id] = s;
  }

  const initial = parseLook(params, { themes, layouts, suggest: (t) => suggestions[t] ?? null });

  return (
    <PlaygroundSection
      initial={initial}
      enabledThemes={themes}
      enabledLayouts={layouts}
      suggestions={suggestions}
      whatsappNumber={settings.domain.whatsappSender}
    />
  );
}
