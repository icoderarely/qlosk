import Image from "next/image";
import { CopyCode } from "../copy-code";
import { Icon, LINK_ICON } from "../icons";
import { locationLine, safeHref } from "../links";
import { Footer, HEAD, IconCircle, Logo, LocationLine, PrimaryButton, WifiChip } from "../parts";
import { STRINGS } from "../strings";
import type { ShopLayoutProps } from "../types";
import { WifiReveal } from "../wifi-reveal";

const ROW =
  "flex min-h-14 items-center gap-3 px-3.5 text-sp-text no-underline";
const ROW_BOX = "rounded-[14px] border border-sp-line bg-sp-card";

export function CoverLayout({ shop, primary, rest, offer, wifi }: ShopLayoutProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div
        className="relative flex h-[150px] items-center justify-center overflow-hidden text-[12px] font-semibold text-sp-text"
        style={{ background: "var(--cover)" }}
      >
        {shop.coverUrl ? (
          <Image
            src={shop.coverUrl}
            alt=""
            fill
            unoptimized
            sizes="430px"
            className="object-cover"
          />
        ) : (
          STRINGS.coverPlaceholder
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        {/* The logo is positioned (z-10) so the cover, which is also positioned, cannot paint over it. */}
        <div className="-mt-[38px] flex flex-col gap-1">
          <Logo shop={shop} className="relative z-10 size-[76px] border-4 border-sp-bg text-[26px]" />
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
            className="flex items-center gap-2.5 rounded-[14px] bg-sp-chipbg px-3.5 py-2.5 text-sp-chiptext"
          >
            <span className="text-[13px] font-bold">{offer.title}</span>
            {offer.code ? (
              <CopyCode
                code={offer.code}
                label="Copy offer code"
                className="ml-auto min-h-11 cursor-pointer border-0 bg-transparent px-1 text-[12px] font-semibold text-sp-chiptext"
              >
                Code {offer.code}
              </CopyCode>
            ) : null}
          </section>
        ) : null}

        {rest.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {rest.map((link) => {
              if (link.type === "wifi" && wifi) {
                return (
                  <WifiReveal
                    key={link.id}
                    wifi={wifi}
                    wrapperClassName={ROW_BOX}
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
                <a key={link.id} href={safeHref(link.href)} className={`${ROW} ${ROW_BOX}`}>
                  <IconCircle name={LINK_ICON[link.type]} size="size-9" iconSize={18} />
                  <span className="flex-1 text-[15px] font-semibold">{link.label}</span>
                  <Icon name="chevron" className="text-sp-muted" />
                </a>
              );
            })}
          </div>
        ) : null}

        <Footer />
      </div>
    </div>
  );
}
