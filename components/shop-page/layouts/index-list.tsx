import { CopyCode } from "../copy-code";
import { Icon } from "../icons";
import { locationLine, safeHref } from "../links";
import { Footer, HEAD, Logo, WifiChip, ShopName } from "../parts";
import { STRINGS } from "../strings";
import type { ShopLayoutProps } from "../types";
import { WifiReveal } from "../wifi-reveal";

const ROW =
  "flex min-h-[60px] items-center gap-3.5 text-sp-text no-underline border-t border-sp-line";

export function IndexLayout({ shop, primary, rest, offer, wifi, nameTag }: ShopLayoutProps) {
  const sub = [shop.tagline, locationLine(shop.area, shop.city)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-7">
      <div className="flex flex-col gap-1.5">
        <Logo shop={shop} className="size-[52px] text-[20px]" />
        <ShopName tag={nameTag}
          className={`m-0 mt-2.5 text-[34px] font-bold leading-[1.08] tracking-[-0.01em] ${HEAD}`}
        >
          {shop.name}
        </ShopName>
        {sub ? <p className="m-0 text-[15px] text-sp-muted">{sub}</p> : null}
      </div>

      {primary ? (
        <a
          href={safeHref(primary.href)}
          className="flex min-h-[88px] items-center justify-between gap-3 rounded-[20px] bg-sp-btn px-5 py-4 text-sp-btntext no-underline"
        >
          <span>
            <span className={`block text-[22px] font-bold leading-[1.15] ${HEAD}`}>
              {primary.label}
            </span>
            <span className="mt-0.5 block text-[13px] font-medium">
              {primary.hint ?? STRINGS.primaryHint}
            </span>
          </span>
          <span className="flex size-11 flex-none items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--btntext)_18%,transparent)]">
            <Icon name="arrow" size={20} />
          </span>
        </a>
      ) : null}

      {offer ? (
        <section
          aria-label="Offer"
          className="flex items-center gap-3 rounded-[14px] bg-sp-chipbg px-4 py-3 text-sp-chiptext"
        >
          <div className="min-w-0 flex-1">
            <div className={`text-[16px] font-bold ${HEAD}`}>{offer.title}</div>
            <div className="text-[12px] font-semibold">
              {offer.note ?? STRINGS.offerDefaultNote}
            </div>
          </div>
          {offer.code ? (
            <CopyCode
              code={offer.code}
              label="Copy offer code"
              className="min-h-11 flex-none cursor-pointer rounded-[10px] border-[1.5px] border-dashed border-sp-chiptext bg-transparent px-3.5 text-[13px] font-bold text-sp-chiptext"
            />
          ) : null}
        </section>
      ) : null}

      {rest.length > 0 ? (
        <div>
          <h2 className="m-0 mb-1 text-[12px] font-bold uppercase tracking-[0.08em] text-sp-muted">
            {STRINGS.everythingElse}
          </h2>
          <div className="border-b border-sp-line">
            {rest.map((link, i) => {
              const num = (
                <span className="w-6 text-[13px] font-bold text-sp-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              );
              if (link.type === "wifi" && wifi) {
                return (
                  <WifiReveal
                    key={link.id}
                    wifi={wifi}
                    wrapperClassName=""
                    buttonClassName={`${ROW} w-full cursor-pointer bg-transparent text-left border-x-0 border-b-0`}
                    panelClassName="mb-3 ml-[38px]"
                    trigger={
                      <>
                        {num}
                        <span className={`flex-1 text-[20px] font-semibold ${HEAD}`}>
                          {link.label}
                        </span>
                        <WifiChip />
                      </>
                    }
                  />
                );
              }
              return (
                <a key={link.id} href={safeHref(link.href)} className={ROW}>
                  {num}
                  <span className={`flex-1 text-[20px] font-semibold ${HEAD}`}>
                    {link.label}
                  </span>
                  <Icon name="arrow" size={20} className="text-sp-muted" />
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
