import { CopyCode } from "../copy-code";
import { Icon, LINK_ICON } from "../icons";
import { safeHref } from "../links";
import { Footer, HEAD, Logo, TopBar } from "../parts";
import { STRINGS, asSentence } from "../strings";
import type { ShopLayoutProps } from "../types";
import { WifiReveal } from "../wifi-reveal";

const BUBBLE =
  "max-w-[290px] self-start rounded-[18px_18px_18px_4px] border border-sp-line bg-sp-card";
const PILL =
  "flex min-h-11 items-center gap-2.5 rounded-full border-[1.5px] border-sp-iconfg px-4 font-semibold text-sp-iconfg no-underline";

export function ChatLayout({ shop, primary, rest, offer, wifi }: ShopLayoutProps) {
  const sub = [shop.tagline, shop.area].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-1 flex-col">
      {/* The top bar sits inside the header band so the head is one colour. */}
      <div className="border-b border-sp-line bg-sp-card">
        <TopBar />
        <header className="flex items-center gap-3 p-5">
          <Logo shop={shop} className="size-12 text-[18px]" />
          <div className="min-w-0">
            <h1 className={`m-0 text-[20px] font-bold leading-[1.2] ${HEAD}`}>
              {shop.name}
            </h1>
            {sub ? <div className="text-[13px] text-sp-muted">{sub}</div> : null}
          </div>
        </header>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className={`${BUBBLE} px-4 py-3`}>{STRINGS.chatWelcome(shop.name)}</div>

        {offer ? (
          <section
            aria-label="Offer"
            className={`${BUBBLE} flex flex-col gap-2 px-4 py-3`}
          >
            <div className={`text-[16px] font-bold ${HEAD}`}>{offer.title}</div>
            <div className="text-[13px] text-sp-muted">
              {asSentence(offer.note ?? STRINGS.offerDefaultNote)}
            </div>
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

        <div className="mt-2 flex flex-col items-end gap-2.5">
          {primary ? (
            <a
              href={safeHref(primary.href)}
              className="flex min-h-12 items-center gap-2.5 rounded-full bg-sp-btn px-[18px] font-bold text-sp-btntext no-underline"
            >
              <Icon name={LINK_ICON[primary.type]} />
              {primary.label}
            </a>
          ) : null}
          {rest.map((link) => {
            if (link.type === "wifi" && wifi) {
              return (
                <WifiReveal
                  key={link.id}
                  wifi={wifi}
                  wrapperClassName="flex flex-col items-end gap-2"
                  buttonClassName={`${PILL} cursor-pointer bg-transparent`}
                  panelClassName="w-[260px] max-w-full"
                  trigger={
                    <>
                      <Icon name="wifi" />
                      {link.label}
                    </>
                  }
                />
              );
            }
            return (
              <a key={link.id} href={safeHref(link.href)} className={PILL}>
                <Icon name={LINK_ICON[link.type]} />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>

      <Footer className="px-5 pb-5" />
    </div>
  );
}
