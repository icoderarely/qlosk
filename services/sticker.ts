// The trial sticker (spec section 8): a 7 x 7 cm white card with the headline, the
// QR with the Qlosk Q mark, the five things a scan opens and the credit line. Every
// QR download in the admin is this file. It is drawn in the 1120-unit space of
// docs/design/ reference and rendered at 600 dpi (1654 px for 7 cm); before it is
// returned the QR is decoded back out of the picture and must read the address.
// No Next.js imports.
import sharp from "sharp";
import { QR_BORDER, QR_INK, buildQrArt, markSvg, qrTarget, type QrArt } from "./qr-art.ts";
import { assertQrReads, renderPng, type PrintFonts } from "./print.ts";

export const STICKER_MM = 70;
export const STICKER_DPI = 600;
export const STICKER_PX = Math.round((STICKER_MM / 25.4) * STICKER_DPI);

const V = 1120;
const INK = "#111111";
const MUTED = "#555555";
const RULE = "#E3E3E3";
/** Left and right edge of the dark modules; the 2-module border is added outside. */
const QR_LEFT = 300;
const QR_WIDTH = 522;
const QR_TOP = 218;
const ICON_SIZE = 56;

const ITEMS: { label: string; icon: string }[] = [
  { label: "Call", icon: `<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>` },
  { label: "Chat", icon: `<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z"/>` },
  { label: "Review", icon: `<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>` },
  { label: "Map", icon: `<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>` },
  { label: "Offers", icon: `<path d="M20 12l-8 8-9-9V3h8z"/><path d="M7.5 7.5v.01"/>` },
];

const BOLD = `font-family="Manrope ExtraBold"`;

/** The sticker as SVG, 1120 units square. */
export function stickerSvg(art: QrArt, code: string): string {
  const cell = QR_WIDTH / art.modules;
  const qr =
    `<g transform="translate(${QR_LEFT - QR_BORDER * cell} ${QR_TOP - QR_BORDER * cell}) scale(${cell})">` +
    `<rect width="${art.modules + 2 * QR_BORDER}" height="${art.modules + 2 * QR_BORDER}" fill="#fff"/>` +
    `<g transform="translate(${QR_BORDER} ${QR_BORDER})"><path d="${art.path}" fill="${QR_INK}"/>${markSvg(art.mark)}</g></g>`;

  const colW = 193;
  const items = ITEMS.map((item, i) => {
    const cx = 174 + i * colW;
    return (
      `<g transform="translate(${cx - ICON_SIZE / 2} 815) scale(${ICON_SIZE / 24})" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</g>` +
      `<text x="${cx}" y="915" text-anchor="middle" ${BOLD} font-size="36" fill="${INK}">${item.label}</text>`
    );
  }).join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${V}" height="${V}">` +
    `<rect width="${V}" height="${V}" fill="#fff"/>` +
    `<rect x="2" y="2" width="${V - 4}" height="${V - 4}" rx="72" fill="#fff" stroke="#D9D9D9" stroke-width="4"/>` +
    `<text x="${V / 2}" y="136" text-anchor="middle" ${BOLD} font-size="66" fill="${INK}">Call, chat or find us. One Scan.</text>` +
    `<title>QR code ${code}</title>` +
    qr +
    items +
    `<rect x="72" y="992" width="976" height="3" fill="${RULE}"/>` +
    `<text x="72" y="1056" font-family="DM Sans" font-size="40" fill="${MUTED}">Powered by <tspan font-weight="700" fill="${INK}">Qlosk</tspan> · qlosk.com</text>` +
    `<text x="1048" y="1056" text-anchor="end" ${BOLD} font-size="38" fill="${INK}">No. ${code}</text>` +
    `</svg>`
  );
}

export function stickerFileName(code: string): string {
  return `qlosk-sticker-${code}-7x7cm.png`;
}

/** 7 x 7 cm PNG at 600 dpi (density written into the file). Throws QrCheckError if the QR does not read back. */
export async function buildStickerPng(
  code: string,
  baseUrl: string,
  fonts: PrintFonts,
  makeArt: (url: string) => QrArt = buildQrArt,
): Promise<Uint8Array> {
  const art = makeArt(qrTarget(baseUrl, code));
  const png = renderPng(stickerSvg(art, code), STICKER_PX, fonts);
  await assertQrReads(png, art.url, "sticker");
  return new Uint8Array(await sharp(png).withMetadata({ density: STICKER_DPI }).png().toBuffer());
}
