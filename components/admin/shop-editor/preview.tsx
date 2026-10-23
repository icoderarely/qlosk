import { Chip } from "../chip";
import { PhoneFrame } from "../phone-frame";
import { ShopPage } from "../../shop-page/shop-page";
import type { ShopLink } from "../../shop-page/types";
import { LINK_DEFAULTS } from "@/services/links";
import type { EditorState } from "./state";

// The real ShopPage, fed from the editor's local state, in the phone frame.
export function Preview({ state }: { state: EditorState }) {
  const { details, links, look, offer, banner, wifi } = state;

  const pageLinks: ShopLink[] = links
    .filter((l) => l.enabled)
    .map((l) => ({
      id: l.id,
      type: l.type,
      label: l.label,
      shortLabel: LINK_DEFAULTS[l.type].shortLabel,
      hint: LINK_DEFAULTS[l.type].hint,
      href: "#",
    }));

  return (
    <aside
      aria-label="Live preview"
      className="box-border flex max-w-[420px] min-w-0 flex-[1_1_372px] flex-col items-center gap-3 rounded-[14px] border border-line bg-white p-5"
    >
      <div className="flex items-baseline justify-between gap-2 self-stretch">
        <h2 className="m-0 text-base font-extrabold">Live preview</h2>
        <Chip tone="amber">Draft</Chip>
      </div>
      <PhoneFrame>
        <ShopPage
          theme={look.theme}
          layout={look.layout}
          font={look.font}
          shop={{
            name: details.name.trim() || "Your shop name",
            tagline: details.tagline || null,
            area: details.areaCity || null,
            logoUrl: details.logoUrl || null,
            coverUrl: details.coverUrl || null,
          }}
          links={pageLinks}
          offer={
            offer.enabled && offer.title.trim()
              ? {
                  title: offer.title,
                  note: offer.note || undefined,
                  code: offer.code || undefined,
                }
              : null
          }
          wifi={wifi.enabled ? { network: wifi.network, password: wifi.password } : null}
          banner={banner.enabled && banner.message.trim() ? { text: banner.message } : null}
        />
      </PhoneFrame>
      <p className="m-0 text-center text-[13px] text-muted">
        Changes show here straight away. Customers see them after you publish.
      </p>
    </aside>
  );
}
