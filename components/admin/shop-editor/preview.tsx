import { Chip } from "../chip";
import { PhoneFrame } from "../phone-frame";
import { ShopPage } from "../../shop-page/shop-page";
import type { ShopLink } from "../../shop-page/types";
import { LINK_DEFAULTS, resolveLinks } from "@/services/links";
import type { EditorState } from "./state";

// The real ShopPage, fed from the editor's local state, in the phone frame.
export function Preview({ state }: { state: EditorState }) {
  const { details, links, look, offer, banner, wifi } = state;

  // Same rules as the live page: a button with nothing to open is left off, and
  // Wi-Fi shows only once it has a network.
  const hasWifi = wifi.enabled && wifi.network.trim() !== "";
  const pageLinks: ShopLink[] = resolveLinks(links, details)
    .links.filter((l) => l.enabled && (l.type === "wifi" ? hasWifi : l.target))
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
          buttonColor={state.buttonColor}
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
          wifi={hasWifi ? { network: wifi.network, password: wifi.password } : null}
          banner={banner.enabled && banner.message.trim() ? { text: banner.message } : null}
        />
      </PhoneFrame>
      <p className="m-0 text-center text-[13px] text-muted">
        Changes show here straight away. Customers see them after you publish.
      </p>
    </aside>
  );
}
