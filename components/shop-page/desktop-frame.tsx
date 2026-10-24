import { STRINGS } from "./strings";

const dataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// On a phone the page fills the screen. From 520px wide up it sits in a phone-shaped
// frame on a dark backdrop, with the shop's own QR code in the corner so a
// visitor on a computer can open it on their phone. The QR is the printed one
// (/q/<code>), never the page address. Pure CSS: no script, no layout shift.
export function DesktopFrame({ qr, children }: { qr?: { svg: string; label: string } | null; children: React.ReactNode }) {
  return (
    <div className="desk-wrap">
      <div className="desk-bezel">
        <div className="desk-screen">
          {children}
        </div>
      </div>
      {qr ? (
        <aside className="fixed bottom-6 right-6 hidden flex-col items-center gap-2 text-white lg:flex">
          <p className="m-0 text-sm font-semibold">{STRINGS.viewOnMobile}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUri(qr.svg)} alt={qr.label} width={132} height={132} className="size-[132px] rounded-xl bg-white" />
        </aside>
      ) : null}
    </div>
  );
}
