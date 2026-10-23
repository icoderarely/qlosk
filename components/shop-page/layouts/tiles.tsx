import { CopyCode } from "../copy-code";
import { LINK_ICON } from "../icons";
import { locationLine, safeHref } from "../links";
import { Footer, HEAD, IconCircle, Logo, LocationLine, PrimaryButton } from "../parts";
import { STRINGS } from "../strings";
import type { ShopLayoutProps } from "../types";
import { WifiReveal } from "../wifi-reveal";

const TILE =
  "flex min-h-28 flex-col justify-between gap-4 p-4 text-sp-text no-underline";
const TILE_BOX = "rounded-[18px] border border-sp-line bg-sp-card";

export function TilesLayout({ shop, primary, rest, offer, wifi }: ShopLayoutProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Logo shop={shop} className="size-[72px] text-[26px]" />
        <h1 className={`m-0 mt-2 text-[28px] font-bold leading-[1.15] ${HEAD}`}>
          {shop.name}
        </h1>
        {shop.tagline ? <p className="m-0 text-sp-muted">{shop.tagline}</p> : null}
        <LocationLine text={locationLine(shop.area, shop.city)} />
      </div>

      {primary ? <PrimaryButton link={primary} /> : null}

      {offer ? (
        <section
          aria-label="Offer"
          className="flex items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-sp-iconfg px-3.5 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className={`text-[16px] font-bold ${HEAD}`}>{offer.title}</div>
            <div className="text-[12px] text-sp-muted">
              {offer.note ?? STRINGS.offerDefaultNote}
            </div>
          </div>
          {offer.code ? (
            <CopyCode
              code={offer.code}
              label="Copy offer code"
              className="min-h-11 flex-none cursor-pointer rounded-xl border border-sp-iconfg bg-sp-card px-3 text-[13px] font-bold text-sp-text"
            />
          ) : null}
        </section>
      ) : null}

      {rest.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {rest.map((link) => {
            const label = link.shortLabel ?? link.label;
            const inner = (
              <>
                <IconCircle name={LINK_ICON[link.type]} size="size-10" iconSize={20} />
                <span>
                  <span className="block text-[15px] font-bold">{label}</span>
                  {link.hint ? (
                    <span className="block text-[12px] text-sp-muted">{link.hint}</span>
                  ) : null}
                </span>
              </>
            );
            if (link.type === "wifi" && wifi) {
              return (
                <WifiReveal
                  key={link.id}
                  wifi={wifi}
                  wrapperClassName={`flex flex-col ${TILE_BOX}`}
                  buttonClassName={`${TILE} w-full flex-1 cursor-pointer border-0 bg-transparent text-left`}
                  panelClassName="mx-3 mb-3"
                  trigger={inner}
                />
              );
            }
            return (
              <a key={link.id} href={safeHref(link.href)} className={`${TILE} ${TILE_BOX}`}>
                {inner}
              </a>
            );
          })}
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
