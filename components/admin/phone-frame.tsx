// The design's phone frame: a 390 x 860 page drawn at scale 0.85 inside a
// 332 x 731 screen. Used by the editor preview; the page inside is the real
// ShopPage.
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="box-border w-[344px] max-w-full rounded-[36px] bg-ink p-1.5">
      <div className="relative h-[731px] w-[332px] max-w-full overflow-hidden rounded-[30px]">
        <div
          className="h-[860px] w-[390px] origin-top-left scale-[0.85] overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ "--page-min-h": "860px" } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
