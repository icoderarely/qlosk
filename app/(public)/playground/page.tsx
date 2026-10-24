import type { Metadata } from "next";
import { WHATSAPP_NUMBER } from "@/lib/brand";
import { Suspense } from "react";
import { PlaygroundSection } from "@/components/playground/playground-section";
import { parseLook } from "@/components/playground/look-url";
import { loadSettings } from "@/lib/load-settings";
import { playgroundOptions } from "@/lib/playground-options";

const TITLE = "Try a look for your shop";
const DESCRIPTION =
  "Free playground: try every theme, layout and font on a sample shop page and see how your Qlosk QR page could look on a phone.";

// The look lives in ?theme=…&layout=…; every variant canonicalises to the clean URL.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/playground" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/playground", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/opengraph-image"] },
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
