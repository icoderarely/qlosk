import Image from "next/image";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { Icon, LINK_ICON, type IconName } from "./icons";
import { initials, safeHref } from "./links";
import { ShareButton } from "./share-button";
import { STRINGS } from "./strings";
import type { NameTag, ShopInfo, ShopLink } from "./types";

export const HEAD = "font-sp-head";

export function Logo({
  shop,
  className,
}: {
  shop: ShopInfo;
  /** Size, text size and any border. */
  className: string;
}) {
  const base = `flex flex-none items-center justify-center overflow-hidden rounded-full bg-sp-btn font-bold text-sp-btntext ${HEAD} ${className}`;
  if (shop.logoUrl) {
    return (
      <div className={base}>
        <Image
          src={shop.logoUrl}
          alt={`${shop.name} logo`}
          width={152}
          height={152}
          unoptimized
          className="size-full object-cover"
        />
      </div>
    );
  }
  return (
    <div role="img" aria-label={STRINGS.logoAlt} className={base}>
      {initials(shop.name)}
    </div>
  );
}

/** The shop name, as an h1 unless the page says otherwise. */
export function ShopName({ tag: Tag, className, children }: { tag: NameTag; className: string; children: React.ReactNode }) {
  return <Tag className={className}>{children}</Tag>;
}

export function LocationLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-sp-muted">
      <Icon name="pin" size={14} />
      {text}
    </div>
  );
}

const CHIP_BTN =
  "relative flex size-11 flex-none items-center justify-center rounded-xl border border-sp-line bg-sp-card text-sp-text";

// Top bar: our mark on the left, a share button on the right.
// `overlay` lays it over the top of the cover photo instead of in the flow.
export function TopBar({ overlay = false }: { overlay?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-5 pt-5 ${overlay ? "absolute inset-x-0 top-0 z-10" : ""}`}>
      <span className={CHIP_BTN} role="img" aria-label={BRAND_NAME}>
        <BrandMark className="size-7" />
      </span>
      <ShareButton className={`${CHIP_BTN} cursor-pointer`} />
    </div>
  );
}

// Bottom: a call to action for shop owners, then who made the page.
export function Footer({ className = "" }: { className?: string }) {
  return (
    <div className={`mt-auto flex flex-col items-center gap-2.5 pt-4 text-center ${className}`}>
      <a
        href="/playground"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sp-chipbg px-5 text-[14px] font-bold text-sp-chiptext no-underline"
      >
        {STRINGS.getYourOwn}
        <Icon name="arrow" size={16} />
      </a>
      <div className="text-[11px] text-sp-muted">
        {STRINGS.poweredBy} {BRAND_NAME}
      </div>
    </div>
  );
}

// The big button used by list, tiles and cover.
export function PrimaryButton({ link }: { link: ShopLink }) {
  return (
    <a
      href={safeHref(link.href)}
      className="flex min-h-16 items-center gap-3 rounded-2xl bg-sp-btn px-4 py-2.5 text-sp-btntext no-underline"
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--btntext)_18%,transparent)]">
        <Icon name={LINK_ICON[link.type]} size={20} />
      </span>
      <span className="flex-1">
        <span className="block text-[16px] font-bold">{link.label}</span>
        <span className="block text-[12px] font-medium">
          {link.hint ?? STRINGS.primaryHint}
        </span>
      </span>
      <Icon name="arrow" size={20} />
    </a>
  );
}

export function IconCircle({
  name,
  size,
  iconSize,
}: {
  name: IconName;
  size: string;
  iconSize: number;
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full bg-sp-iconbg text-sp-iconfg ${size}`}
    >
      <Icon name={name} size={iconSize} />
    </span>
  );
}

export function WifiChip() {
  return (
    <span className="rounded-full bg-sp-chipbg px-2.5 py-1 text-[12px] font-bold text-sp-chiptext">
      {STRINGS.wifiChip}
    </span>
  );
}
