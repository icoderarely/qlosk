import { PlaygroundSection } from "@/components/playground/playground-section";
import { parseLook } from "@/components/playground/look-url";
import type { LandingData } from "@/lib/landing-data";
import { SectionHead } from "./parts";

// The playground from slice 3, inside the landing page. It starts on the salon
// look with the editorial font, like the design.
export function TryIt({ data }: { data: LandingData }) {
  const { themes, layouts, suggestions, whatsappNumber } = data;
  const initial = parseLook(
    { type: "salon", font: "editorial" },
    { themes, layouts, suggest: (t) => suggestions[t] ?? null },
  );
  return (
    <section id="try" className="l-sec l-playband" aria-labelledby="try-title">
      <div className="l-wrap">
        <SectionHead
          titleId="try-title"
          kicker="Try it yourself"
          title="Make it yours in a minute."
          lead="Pick your shop type, type your name and watch the page change."
        />
        <PlaygroundSection
          variant="landing"
          syncUrl={false}
          initial={initial}
          enabledThemes={themes}
          enabledLayouts={layouts}
          suggestions={suggestions}
          whatsappNumber={whatsappNumber}
        />
      </div>
    </section>
  );
}
