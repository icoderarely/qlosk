import { THEME_OPTIONS, LAYOUT_OPTIONS } from "@/components/admin/look-options";
import { SAMPLES, type ShopTypeId } from "@/components/playground/samples";
import { ShopPage } from "@/components/shop-page/shop-page";
import type { FontId, LayoutId, ThemeId } from "@/components/shop-page/types";
import type { Suggestions } from "@/lib/playground-options";
import { Ic, SectionHead } from "./parts";

// One phone per shop type, in the look Settings suggests for it. The font is
// not part of a suggestion, so each type keeps the one from the design.
const GALLERY: { type: ShopTypeId; font: FontId; fallback: { theme: ThemeId; layout: LayoutId } }[] = [
  { type: "clinic", font: "clean", fallback: { theme: "daylight", layout: "chat" } },
  { type: "gym", font: "clean", fallback: { theme: "nightfall", layout: "index" } },
  { type: "salon", font: "editorial", fallback: { theme: "blush", layout: "list" } },
  { type: "cafe", font: "rounded", fallback: { theme: "marigold", layout: "tiles" } },
  { type: "jeweller", font: "editorial", fallback: { theme: "graphite", layout: "cover" } },
];

export function Looks({ suggestions }: { suggestions: Suggestions }) {
  return (
    <section className="l-sec" style={{ paddingBottom: 88 }} aria-labelledby="looks-title">
      <div className="l-wrap">
        <SectionHead
          centered
          titleId="looks-title"
          kicker="Looks"
          title="A page that feels like your shop."
          lead="Five themes, five layouts and three fonts. We suggest one for your kind of shop, or you pick."
        />
        <ul className="l-looks" style={{ listStyle: "none", margin: 0 }}>
          {GALLERY.map(({ type, font, fallback }) => {
            const sample = SAMPLES[type];
            const look = suggestions[type] ?? fallback;
            const theme = THEME_OPTIONS.find((t) => t.id === look.theme)?.name ?? look.theme;
            const layout = LAYOUT_OPTIONS.find((l) => l.id === look.layout)?.name ?? look.layout;
            return (
              <li key={type} className="l-mini">
                <div className="l-mframe" aria-hidden="true">
                  <div className="l-mscreen" inert>
                    <div className="l-minner">
                      <ShopPage
                        theme={look.theme}
                        layout={look.layout}
                        font={font}
                        shop={sample.shop}
                        links={sample.links}
                        offer={sample.offer}
                        wifi={sample.wifi}
                        banner={sample.banner}
                        nameTag="div"
                      />
                    </div>
                  </div>
                </div>
                <div className="l-mlabel">
                  {sample.label}
                  <span>{theme} · {layout}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="l-center">
          <a className="l-btn l-btn-k" href="#try">Try them on your shop <Ic d="arrowDown" /></a>
        </div>
      </div>
    </section>
  );
}
