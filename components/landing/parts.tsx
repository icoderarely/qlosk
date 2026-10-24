import { whatsappTarget } from "@/services/links";

/** wa.me link with the message filled in. Without a number (not set yet) WhatsApp asks who to message. */
export function waHref(number: string, message: string): string {
  return whatsappTarget(number, message) ?? `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export const WA_HELLO = "Hi, I would like a QR page for my shop.";

// 24x24 stroke paths from docs/design/LandingV2.dc.html.
export const PATHS = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  arrowLong: "M4 12h15M13 6l6 6-6 6",
  check: "M5 12l5 5L20 7",
  plus: "M12 5v14M5 12h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  whatsapp: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  wifi: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.01",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5z",
  ticket: "M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z M10 6v12",
  camera: "M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z",
  pencil: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
  qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
} as const;

export type IconName = keyof typeof PATHS;

export function Ic({ d, className = "" }: { d: IconName; className?: string }) {
  return (
    <svg className={`l-ic ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[d]} />
    </svg>
  );
}

/** A drawn QR look-alike for the page art. It is not a scannable code. */
export function QrArt({ size, label }: { size: number; label: string }) {
  return (
    <svg className="l-qr" viewBox="0 0 96 96" width={size} height={size} role="img" aria-label={label}>
      <g className="l-qr-stroke">
        <rect x="6" y="6" width="28" height="28" />
        <rect x="62" y="6" width="28" height="28" />
        <rect x="6" y="62" width="28" height="28" />
      </g>
      <g className="l-qr-fill">
        <rect x="15" y="15" width="10" height="10" />
        <rect x="71" y="15" width="10" height="10" />
        <rect x="15" y="71" width="10" height="10" />
        <rect x="42" y="8" width="8" height="8" />
        <rect x="42" y="24" width="8" height="8" />
        <rect x="8" y="42" width="8" height="8" />
        <rect x="24" y="42" width="8" height="8" />
        <rect x="42" y="42" width="8" height="8" />
        <rect x="58" y="42" width="8" height="8" />
        <rect x="74" y="42" width="8" height="8" />
        <rect x="42" y="58" width="8" height="8" />
        <rect x="58" y="66" width="8" height="8" />
        <rect x="74" y="58" width="8" height="8" />
        <rect x="42" y="74" width="8" height="8" />
        <rect x="74" y="76" width="8" height="8" />
      </g>
    </svg>
  );
}

export function SectionHead({
  kicker,
  title,
  lead,
  centered = false,
  titleId,
}: {
  kicker: string;
  title: string;
  lead?: string;
  centered?: boolean;
  titleId?: string;
}) {
  return (
    <div className={`l-head${centered ? " l-head-c" : ""}`}>
      <span className="l-kick">{kicker}</span>
      <h2 id={titleId} className="l-serif l-h2">{title}</h2>
      {lead ? <p className="l-lead">{lead}</p> : null}
    </div>
  );
}
