import { FONT_PACKS } from "./fonts";
import { ChatLayout } from "./layouts/chat";
import { CoverLayout } from "./layouts/cover";
import { IndexLayout } from "./layouts/index-list";
import { ListLayout } from "./layouts/list";
import { TilesLayout } from "./layouts/tiles";
import { splitLinks } from "./links";
import { themeStyle } from "./themes";
import type { LayoutId, ShopLayoutProps, ShopPageProps } from "./types";

const LAYOUTS: Record<LayoutId, (props: ShopLayoutProps) => React.JSX.Element> = {
  list: ListLayout,
  tiles: TilesLayout,
  cover: CoverLayout,
  index: IndexLayout,
  chat: ChatLayout,
};

// The one component behind /s/[slug], the editor preview and /playground.
// It fills the width of its container and centres a column of at most 430px.
// A parent can set --page-min-h to change the minimum height (default: the
// viewport). Rendered on the server; only the copy and Wi-Fi buttons ship JS.
export function ShopPage({
  theme,
  layout,
  font,
  shop,
  links,
  offer = null,
  wifi = null,
  banner = null,
  buttonColor = null,
}: ShopPageProps) {
  const pack = FONT_PACKS[font] ?? FONT_PACKS.clean;
  const Layout = LAYOUTS[layout] ?? ListLayout;
  const { primary, rest } = splitLinks(links, wifi);

  return (
    <div
      data-theme={theme}
      data-layout={layout}
      data-font={font}
      className={`shop-page flex min-h-[var(--page-min-h,100dvh)] w-full justify-center bg-sp-bg font-sp-body text-[14px] leading-[1.4] text-sp-text ${pack.className}`}
      style={{
        ...themeStyle(theme),
        // Hex only, so nothing else can be written into the style.
        ...(buttonColor && /^#[0-9a-f]{6}$/i.test(buttonColor) ? { "--btn": buttonColor } : {}),
        "--head": pack.head,
        "--body": pack.body,
      } as React.CSSProperties}
    >
      <div className="flex w-full max-w-[430px] flex-col">
        {banner ? (
          <div
            role="note"
            className="bg-sp-chipbg px-5 py-2.5 text-center text-[13px] font-bold text-sp-chiptext"
          >
            {banner.text}
          </div>
        ) : null}
        <Layout shop={shop} primary={primary} rest={rest} offer={offer} wifi={wifi} />
      </div>
    </div>
  );
}
