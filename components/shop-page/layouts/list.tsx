import { CopyCode } from "../copy-code";
import { Icon, LINK_ICON } from "../icons";
import { locationLine, safeHref } from "../links";
import { Footer, HEAD, IconCircle, Logo, LocationLine, PrimaryButton, WifiChip, ShopName } from "../parts";
import { STRINGS } from "../strings";
import type { ShopLayoutProps } from "../types";
import { WifiReveal } from "../wifi-reveal";

const ROW =
  "flex min-h-14 items-center gap-3 px-3.5 text-sp-text no-underline";

export function ListLayout({ shop, primary, rest, offer, wifi, nameTag }: ShopLayoutProps) {
  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Logo shop={shop} className="size-[72px] text-[26px]" />
        <ShopName tag={nameTag} className={`m-0 mt-2 text-[28px] font-bold leading-[1.15] ${HEAD}`}>
          {shop.name}
        </ShopName>
        {shop.tagline ? <p className="m-0 text-sp-muted">{shop.tagline}</p> : null}
        <LocationLine text={locationLine(shop.area, shop.city)} />
      </div>

      {primary ? <PrimaryButton link={primary} /> : null}

      {rest.length > 0 ? (
        <div>
          <h2 className="m-0 mb-2 ml-1 text-[12px] font-bold uppercase tracking-[0.08em] text-sp-muted">
            {STRINGS.moreWays}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-sp-line bg-sp-card">
            {rest.map((link, i) => {
              const border = i > 0 ? "border-t border-sp-line" : "";
              if (link.type === "wifi" && wifi) {
                return (
                  <WifiReveal
                    key={link.id}
                    wifi={wifi}
                    wrapperClassName={border}
                    buttonClassName={`${ROW} w-full cursor-pointer border-0 bg-transparent text-left`}
                    panelClassName="mx-3.5 mb-3"
                    trigger={
                      <>
                        <IconCircle name="wifi" size="size-9" iconSize={18} />
                        <span className="flex-1 text-[15px] font-semibold">{link.label}</span>
                        <WifiChip />
                      </>
                    }
                  />
                );
              }
              return (
                <a key={link.id} href={safeHref(link.href)} className={`${ROW} ${border}`}>
                  <IconCircle name={LINK_ICON[link.type]} size="size-9" iconSize={18} />
                  <span className="flex-1 text-[15px] font-semibold">{link.label}</span>
                  <Icon name="chevron" className="text-sp-muted" />
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      {offer ? (
        <section
          aria-label="Offer"
          className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-sp-iconfg px-4 py-3.5"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sp-chipbg px-2.5 py-[3px] text-[12px] font-bold text-sp-chiptext">
              {STRINGS.offerBadge}
            </span>
            <span className="text-[12px] text-sp-muted">
              {offer.note ?? STRINGS.offerDefaultNote}
            </span>
          </div>
          <h2 className={`m-0 text-[18px] font-bold ${HEAD}`}>{offer.title}</h2>
          {offer.code ? (
            <CopyCode
              code={offer.code}
              label="Copy offer code"
              className="min-h-11 cursor-pointer rounded-xl border border-sp-iconfg bg-sp-card text-[14px] font-bold text-sp-text"
            >
              {offer.code} · {STRINGS.copyCode}
            </CopyCode>
          ) : null}
        </section>
      ) : null}

      <Footer />
    </div>
  );
}
