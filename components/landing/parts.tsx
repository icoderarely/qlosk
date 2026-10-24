import { whatsappTarget } from "@/services/links";

/** wa.me link with the message filled in. Without a number (not set yet) WhatsApp asks who to message. */
export function waHref(number: string, message: string): string {
  return whatsappTarget(number, message) ?? `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export const WA_HELLO = "Hi, I would like a QR page for my shop.";

/** Where on the site a WhatsApp button sits. The message tells us which one was tapped. */
export type WaSource = "navbar" | "menu" | "hero" | "pricing" | "pricing-all" | "closing" | "footer" | "privacy" | "terms" | "refunds";

const WA_FROM: Record<WaSource, string> = {
  navbar: "Hi, I tapped \"Let's go\" in the top bar of your website. I would like a QR page for my shop.",
  menu: "Hi, I opened the menu on your website. I would like a QR page for my shop.",
  hero: "Hi, I saw your homepage. I would like a QR page for my shop.",
  pricing: "Hi, what are your plans and prices?",
  "pricing-all": "Hi, what are your plans and prices?",
  closing: "Hi, I read your whole website and I am ready. I would like a QR page for my shop.",
  footer: "Hi, I have a question about your QR pages.",
  privacy: "Hi, I have a question about your Privacy Policy.",
  terms: "Hi, I have a question about your Terms.",
  refunds: "Hi, I have a question about your Refund policy.",
};

/** wa.me link whose message says which button on the site it came from. */
export function waFrom(number: string, source: WaSource): string {
  return waHref(number, WA_FROM[source]);
}

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

/** A drawn QR look-alike for the page art. It is not a scannable code, but it carries the Q mark like a real one. */
// `variant` turns the same art so a row of them reads as different codes.
export function QrArt({ size, label, variant = 0 }: { size: number; label: string; variant?: 0 | 1 | 2 | 3 }) {
  return (
    <svg className={variant ? `l-qr l-qr-v${variant}` : "l-qr"} viewBox="0 0 96 96" width={size} height={size} role="img" aria-label={label}>
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
      {/* The Q mark in the middle, as on every real code (spec section 11): white gap, near-black mark. */}
      <rect x="34" y="34" width="28" height="28" fill="#fff" />
      <g transform="translate(37 37) scale(0.6667) translate(-6 -6)" fill="none" stroke="#0D1F1B">
        <rect x="9" y="9" width="26" height="26" rx="9" strokeWidth="6" />
        <rect x="18" y="18" width="8" height="8" rx="2" fill="#0D1F1B" stroke="none" />
        <rect x="28.5" y="28.5" width="12" height="12" rx="3.2" fill="#0D1F1B" stroke="#fff" strokeWidth="3" />
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

/** The WhatsApp logo, filled. */
export function WhatsAppLogo() {
  return (
    <svg className="l-wa-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
