import type { Metadata } from "next";
import { WHATSAPP_NUMBER } from "@/lib/brand";
import { Suspense } from "react";
import { PlaygroundSection } from "@/components/playground/playground-section";
import { parseLook } from "@/components/playground/look-url";
import { loadSettings } from "@/lib/load-settings";
import { playgroundOptions } from "@/lib/playground-options";

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

  const { themes, layouts, suggestions } = playgroundOptions(settings);

  const initial = parseLook(params, { themes, layouts, suggest: (t) => suggestions[t] ?? null });

  return (
    <PlaygroundSection
      initial={initial}
      enabledThemes={themes}
      enabledLayouts={layouts}
      suggestions={suggestions}
      whatsappNumber={WHATSAPP_NUMBER}
    />
  );
}
