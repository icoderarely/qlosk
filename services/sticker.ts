// The trial sticker (spec section 8): a 7 x 7 cm white card with the headline, the
// QR with the Qlosk Q mark, the five things a scan opens and the credit line. Every
// QR download in the admin is this design: one code as a PNG, or many as an A4 PDF
// to cut out. It is drawn in a 1120-unit square (docs/design/ reference). Before a
// file is returned the QR is decoded back out of the finished picture and must read
// the address. No Next.js imports.
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { measure } from "../components/standee/text.ts";
import { QR_BORDER, QR_INK, buildQrArt, markSvg, qrTarget, type QrArt } from "./qr-art.ts";
import {
  MM,
  QrCheckError,
  assertQrReads,
  collect,
  crop,
  drawSvg,
  embedFonts,
  rasterisePdf,
  readPixels,
  renderPng,
  type PrintFonts,
} from "./print.ts";

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
const HEADLINE = "Everything about us, one scan away.";
const HEADLINE_SIZE = 66;
/** The headline fills at most the width between the card's 72-unit side margins. */
const HEADLINE_FIT = V - 2 * 72;
const CREDIT = 40;
const LOGO = 46;

/** The Qlosk logo tile (components/brand-mark.tsx) at `size` units with its top-left at (x, y). */
function logoSvg(x: number, y: number, size: number): string {
  return (
    `<g transform="translate(${x} ${y}) scale(${size / 48})">` +
    `<rect width="48" height="48" rx="14" fill="#FBF1B5"/>` +
    `<rect x="9" y="9" width="26" height="26" rx="9" fill="none" stroke="${QR_INK}" stroke-width="6"/>` +
    `<rect x="18" y="18" width="8" height="8" rx="2" fill="${QR_INK}"/>` +
    `<rect x="28.5" y="28.5" width="12" height="12" rx="3.2" fill="${QR_INK}" stroke="#FBF1B5" stroke-width="3"/>` +
    `</g>`
  );
}

/** "Powered by [logo] Qlosk · qlosk.com", left edge at x, text baseline at y. */
function creditSvg(x: number, y: number): string {
  const by = measure("dmsans400", CREDIT, "Powered by");
  const logoX = x + by + 14;
  const wordX = logoX + LOGO + 10;
  const dotX = wordX + measure("dmsans700", CREDIT, "Qlosk") + measure("dmsans400", CREDIT, " ");
  const text = `font-family="DM Sans" font-size="${CREDIT}"`;
  return (
    `<text x="${x}" y="${y}" ${text} font-weight="400" fill="${MUTED}">Powered by</text>` +
    logoSvg(r(logoX), r(y - 28 - (LOGO - 28) / 2), LOGO) +
    `<text x="${r(wordX)}" y="${y}" ${text} font-weight="700" fill="${INK}">Qlosk</text>` +
    `<text x="${r(dotX)}" y="${y}" ${text} font-weight="400" fill="${MUTED}">· qlosk.com</text>`
  );
}

const r = (v: number) => Math.round(v * 100) / 100;

function headlineSize(): number {
  const width = measure("manrope800", HEADLINE_SIZE, HEADLINE);
  return r(Math.min(HEADLINE_SIZE, (HEADLINE_SIZE * HEADLINE_FIT) / width));
}

/** Everything on the sticker, in the 1120-unit square (no outer svg, so a sheet can place it). */
export function stickerBody(art: QrArt, code: string): string {
  const cell = QR_WIDTH / art.modules;
  const size = art.modules + 2 * QR_BORDER;
  const qr =
    `<g transform="translate(${r(QR_LEFT - QR_BORDER * cell)} ${r(QR_TOP - QR_BORDER * cell)}) scale(${cell})">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
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
    `<rect width="${V}" height="${V}" fill="#fff"/>` +
    `<rect x="2" y="2" width="${V - 4}" height="${V - 4}" rx="72" fill="#fff" stroke="#D9D9D9" stroke-width="4"/>` +
    `<text x="${V / 2}" y="136" text-anchor="middle" ${BOLD} font-size="${headlineSize()}" fill="${INK}">${HEADLINE}</text>` +
    qr +
    items +
    `<rect x="72" y="992" width="976" height="3" fill="${RULE}"/>` +
    creditSvg(72, 1056) +
    `<text x="1048" y="1056" text-anchor="end" ${BOLD} font-size="38" fill="${INK}">No. ${code}</text>`
  );
}

/** The sticker as SVG, 1120 units square. */
export function stickerSvg(art: QrArt, code: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${V}" height="${V}">${stickerBody(art, code)}</svg>`;
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

// ---- A4 sheet of stickers --------------------------------------------------------

// 2 across x 3 down. Each sticker sits in an 80 mm cell with 5 mm of white around its
// border, and the crop marks sit on the cell lines, so every cut falls in the middle of
// the space between two stickers (or 5 mm outside the outer ones). A short header and
// footer line fit in the margins.
const A4 = { w: 210, h: 297 };
export const SHEET_COLS = 2;
export const SHEET_ROWS = 3;
export const STICKERS_PER_SHEET = SHEET_COLS * SHEET_ROWS;
const GAP = 10;
const PITCH = STICKER_MM + GAP;
/** Where the first sticker starts: the grid of cells is centred, and the sticker sits half a gap inside its cell. */
const LEFT = (A4.w - SHEET_COLS * PITCH) / 2 + GAP / 2;
const TOP = (A4.h - SHEET_ROWS * PITCH) / 2 + GAP / 2;
const MARK_GAP = 1.5;
const MARK_LEN = 4;
const MARK_WIDTH = 0.25 / MM; // 0.25 pt, in mm
/** Pixels per PDF point the finished PDF is drawn at to be read back: 9 to 15 per module. */
const SHEET_CHECK_SCALES = [3, 4, 3.5, 5, 2.5];

export function stickerSheetFileName(count: number): string {
  return `qlosk-stickers-${count}-${count === 1 ? "code" : "codes"}-a4.pdf`;
}

/** Where each sticker starts (left edges across, top edges down), in mm. */
const xAt = (col: number) => LEFT + col * PITCH;
const yAt = (row: number) => TOP + row * PITCH;

/** Ticks outside the grid of cells where every cut line meets the edge. */
function cropMarks(): string {
  const cut = (start: number, n: number) => Array.from({ length: n + 1 }, (_, i) => start - GAP / 2 + i * PITCH);
  const xs = cut(LEFT, SHEET_COLS);
  const ys = cut(TOP, SHEET_ROWS);
  const [left, right] = [xs[0], xs[xs.length - 1]];
  const [top, bottom] = [ys[0], ys[ys.length - 1]];
  let d = "";
  for (const x of xs) d += `M${x} ${top - MARK_GAP - MARK_LEN}V${top - MARK_GAP}M${x} ${bottom + MARK_GAP}V${bottom + MARK_GAP + MARK_LEN}`;
  for (const y of ys) d += `M${left - MARK_GAP - MARK_LEN} ${y}H${left - MARK_GAP}M${right + MARK_GAP} ${y}H${right + MARK_GAP + MARK_LEN}`;
  return `<path d="${d}" fill="none" stroke="#000" stroke-width="${r(MARK_WIDTH * 1000) / 1000}"/>`;
}

function sheetPageSvg(cells: { code: string; art: QrArt }[]): string {
  const stickers = cells
    .map((cell, i) => {
      const x = xAt(i % SHEET_COLS);
      const y = yAt(Math.floor(i / SHEET_COLS));
      return `<g transform="translate(${x} ${y}) scale(${STICKER_MM / V})">${stickerBody(cell.art, cell.code)}</g>`;
    })
    .join("");
  const note = (y: number, text: string) =>
    `<text x="${LEFT}" y="${y}" ${BOLD} font-size="3.4" fill="${INK}">${text}</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A4.w} ${A4.h}" width="${r(A4.w * MM)}" height="${r(A4.h * MM)}">` +
    `<rect width="${A4.w}" height="${A4.h}" fill="#fff"/>` +
    note(16, `Qlosk trial stickers · ${STICKER_MM} × ${STICKER_MM} mm · ${STICKERS_PER_SHEET} per A4 sheet`) +
    stickers +
    cropMarks() +
    note(283, "Print at 100%, no fit to page. Cut along the crop marks.") +
    `</svg>`
  );
}

/**
 * A4 PDF of stickers, 6 to a page in the order given, with crop marks. Text is
 * embedded and the QR is vector. Every code is read back from the finished PDF.
 */
export async function buildStickerSheet(
  codes: string[],
  baseUrl: string,
  fonts: PrintFonts,
  makeArt: (url: string) => QrArt = buildQrArt,
): Promise<Uint8Array> {
  if (codes.length === 0) throw new Error("Pick at least one code.");
  const cells = codes.map((code) => ({ code, art: makeArt(qrTarget(baseUrl, code)) }));
  const pages = Array.from({ length: Math.ceil(cells.length / STICKERS_PER_SHEET) }, (_, p) =>
    cells.slice(p * STICKERS_PER_SHEET, (p + 1) * STICKERS_PER_SHEET),
  );

  const doc = new PDFDocument({
    size: [A4.w * MM, A4.h * MM],
    margin: 0,
    autoFirstPage: false,
    info: { Title: "Qlosk trial stickers", Author: "Qlosk", Producer: "Qlosk", Creator: "Qlosk" },
  });
  const done = collect(doc);
  const fontFor = embedFonts(doc, fonts);
  for (const page of pages) {
    doc.addPage({ size: [A4.w * MM, A4.h * MM], margin: 0 });
    drawSvg(doc, sheetPageSvg(page), A4.w * MM, A4.h * MM, fontFor);
  }
  doc.end();
  const bytes = await done;

  // Draw each page of the finished PDF and read every sticker's QR from its own square.
  // jsQR is sensitive to the exact pixel grid (see CHECK_WIDTHS in print.ts), so a cell
  // that does not read at one drawing size is tried at the next; a wrong address fails at once.
  for (const [p, page] of pages.entries()) {
    let pending = page.map((cell, i) => ({ cell, i }));
    for (const scale of SHEET_CHECK_SCALES) {
      if (pending.length === 0) break;
      const picture = await rasterisePdf(bytes, p + 1, scale);
      const side = STICKER_MM * MM * scale;
      pending = pending.filter(({ cell, i }) => {
        const x = xAt(i % SHEET_COLS) * MM * scale;
        const y = yAt(Math.floor(i / SHEET_COLS)) * MM * scale;
        const got = readPixels(crop(picture, x, y, side, side));
        if (got !== null && got !== cell.art.url) {
          throw new QrCheckError(`The QR code for ${cell.code} on the sticker sheet reads ${got} instead of ${cell.art.url}. Nothing was saved.`);
        }
        return got === null;
      });
    }
    if (pending.length > 0) {
      throw new QrCheckError(`The QR code for ${pending[0].cell.code} on the sticker sheet could not be read back. Nothing was saved.`);
    }
  }
  return bytes;
}
