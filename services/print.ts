// Print files (spec sections 8 and 9, slice 6): an A5 standee and a 4x6 inch
// card for one shop, and a sheet of unassigned codes. The QR is drawn as vector
// paths, never an image, with error correction Q and a quiet zone of 4 modules.
// It encodes QR_BASE_URL/q/<code> only, never the shop page. Fonts are embedded.
// Fonts and the logo come in as bytes so this file needs no disk, no network and
// no Next.js. Loading them is lib/print-assets.ts.
import fontkit from "@pdf-lib/fontkit";
// @pdf-lib/fontkit shapes Devanagari with generator code that needs this global.
import "regenerator-runtime/runtime.js";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import qrcode from "qrcode-generator";
import { isValidCode } from "./qr.ts";

export const MM = 72 / 25.4; // PDF points per millimetre
export const BLEED_MM = 3;
export const QUIET_MODULES = 4;
export const MIN_QR_MM = 30;

export type PrintFonts = {
  regular: Uint8Array;
  bold: Uint8Array;
  /** Used for names the Latin font cannot show, such as Hindi or Marathi. */
  indicRegular?: Uint8Array;
  indicBold?: Uint8Array;
};

export type PrintShop = {
  name: string;
  code: string;
  /** PNG or JPEG bytes. Left out when the shop has no logo. */
  logo?: Uint8Array | null;
};

// ---- The QR itself -----------------------------------------------------------

/** The one address a printed QR may carry. */
export function qrTarget(baseUrl: string, code: string): string {
  if (!isValidCode(code)) throw new Error(`Not a valid QR code: ${code}`);
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new Error("QR_BASE_URL is not a valid address.");
  }
  if (base.protocol !== "https:" && base.protocol !== "http:") throw new Error("QR_BASE_URL must start with https://");
  return `${base.origin}${base.pathname.replace(/\/+$/, "")}/q/${code}`;
}

/** Dark modules as rows of booleans, error correction Q. */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "Q");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

const num = (v: number) => String(Math.round(v * 1000) / 1000);

/** One path of rectangles (runs of dark modules), each module `size` wide, from (0,0). */
function qrPath(matrix: boolean[][], size: number, offset: number): string {
  let d = "";
  matrix.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (!row[c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < row.length && row[c]) c++;
      d += `M${num(offset + start * size)} ${num(offset + r * size)}h${num((c - start) * size)}v${num(size)}h${num(-(c - start) * size)}z`;
    }
  });
  return d;
}

/** The QR as a standalone SVG, quiet zone included. */
export function qrSvg(text: string): string {
  const m = qrMatrix(text);
  const size = m.length + QUIET_MODULES * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path d="${qrPath(m, 1, QUIET_MODULES)}" fill="#000"/></svg>`
  );
}

/**
 * Draws the QR with its top-left at (x, topY) in points, `sizeMm` wide, on a white
 * square that includes the quiet zone. Returns the width of that white square.
 */
function drawQr(page: PDFPage, matrix: boolean[][], x: number, topY: number, sizeMm: number): number {
  const n = matrix.length;
  const cell = (sizeMm * MM) / n;
  const quiet = QUIET_MODULES * cell;
  const total = n * cell + quiet * 2;
  page.drawRectangle({ x, y: topY - total, width: total, height: total, color: rgb(1, 1, 1) });
  page.drawSvgPath(qrPath(matrix, cell, quiet), { x, y: topY, color: rgb(0, 0, 0), borderWidth: 0 });
  return total;
}

// ---- Text --------------------------------------------------------------------

type Faces = { regular: PDFFont; bold: PDFFont; indicRegular?: PDFFont; indicBold?: PDFFont };

async function loadFaces(pdf: PDFDocument, fonts: PrintFonts): Promise<Faces> {
  pdf.registerFontkit(fontkit);
  const embed = (bytes: Uint8Array) => pdf.embedFont(bytes, { subset: true });
  return {
    regular: await embed(fonts.regular),
    bold: await embed(fonts.bold),
    indicRegular: fonts.indicRegular ? await embed(fonts.indicRegular) : undefined,
    indicBold: fonts.indicBold ? await embed(fonts.indicBold) : undefined,
  };
}

function covers(font: PDFFont, text: string): boolean {
  const set = new Set(font.getCharacterSet());
  return [...text].every((ch) => set.has(ch.codePointAt(0)!) || ch === " ");
}

/** The Latin font if it can show the text, else the Indic one; unknown characters are dropped. */
function pick(faces: Faces, text: string, bold: boolean): { font: PDFFont; text: string } {
  const latin = bold ? faces.bold : faces.regular;
  if (covers(latin, text)) return { font: latin, text };
  const indic = bold ? faces.indicBold : faces.indicRegular;
  if (indic && covers(indic, text)) return { font: indic, text };
  const best = indic ?? latin;
  const set = new Set(best.getCharacterSet());
  return { font: best, text: [...text].filter((ch) => set.has(ch.codePointAt(0)!) || ch === " ").join("") };
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const tryLine = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(tryLine, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = tryLine;
  }
  if (line) lines.push(line);
  return lines;
}

/** Biggest size from `max` down to `min` at which the text fits in `maxLines` lines. */
function fitText(font: PDFFont, text: string, max: number, min: number, maxWidth: number, maxLines: number) {
  for (let size = max; size >= min; size -= 1) {
    const lines = wrap(font, text, size, maxWidth);
    if (lines.length <= maxLines && lines.every((l) => font.widthOfTextAtSize(l, size) <= maxWidth)) return { size, lines };
  }
  // Still too long: shorten the last line rather than run off the page.
  const lines = wrap(font, text, min, maxWidth).slice(0, maxLines);
  let last = lines[lines.length - 1] ?? "";
  while (last.length > 1 && font.widthOfTextAtSize(`${last}...`, min) > maxWidth) last = last.slice(0, -1);
  lines[lines.length - 1] = `${last}...`;
  return { size: min, lines };
}

function centered(page: PDFPage, font: PDFFont, text: string, size: number, centerX: number, y: number, color = rgb(0.07, 0.08, 0.1)) {
  page.drawText(text, { x: centerX - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
}

// ---- Shop print files --------------------------------------------------------

export type PrintFormat = "a5" | "card";

// Trim size in mm and the QR width (without quiet zone). The A5 QR is 80 mm so
// it scans from about a metre away; the card is held closer.
const FORMATS: Record<PrintFormat, { w: number; h: number; qr: number; name: number; label: string }> = {
  a5: { w: 148, h: 210, qr: 80, name: 30, label: "A5 standee" },
  card: { w: 4 * 25.4, h: 6 * 25.4, qr: 62, name: 26, label: "4x6 card" },
};

export function printFileName(format: PrintFormat | "svg", code: string): string {
  return format === "svg" ? `qr-${code}.svg` : `${format === "a5" ? "a5-standee" : "card-4x6"}-${code}.pdf`;
}

export async function buildShopPrint(
  format: PrintFormat,
  shop: PrintShop,
  baseUrl: string,
  fonts: PrintFonts,
): Promise<Uint8Array> {
  const f = FORMATS[format];
  const url = qrTarget(baseUrl, shop.code);
  const matrix = qrMatrix(url);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${shop.name} - ${f.label}`);
  pdf.setProducer("QR shop pages");
  const faces = await loadFaces(pdf, fonts);

  // The page is the trim size plus bleed on every side; boxes tell the printer where to cut.
  const trimW = f.w * MM;
  const trimH = f.h * MM;
  const b = BLEED_MM * MM;
  const page = pdf.addPage([trimW + 2 * b, trimH + 2 * b]);
  page.setBleedBox(0, 0, trimW + 2 * b, trimH + 2 * b);
  page.setTrimBox(b, b, trimW, trimH);
  page.setCropBox(0, 0, trimW + 2 * b, trimH + 2 * b);

  const ink = rgb(0.07, 0.08, 0.1);
  const muted = rgb(0.33, 0.36, 0.43);
  const cx = b + trimW / 2;
  const top = b + trimH; // y of the top trim edge
  const safe = 10 * MM; // keep text and logo this far inside the trim
  const maxWidth = trimW - 2 * safe;

  // Full-bleed background runs past the trim line.
  page.drawRectangle({ x: 0, y: 0, width: trimW + 2 * b, height: trimH + 2 * b, color: rgb(0.953, 0.965, 0.984) });

  let y = top - safe - (format === "a5" ? 18 * MM : 0); // A5 has room to spare; sit lower

  // Logo, kept in proportion inside a box.
  if (shop.logo && shop.logo.length > 0) {
    const image = isPng(shop.logo) ? await pdf.embedPng(shop.logo) : await pdf.embedJpg(shop.logo);
    const box = (format === "a5" ? 24 : 20) * MM;
    const scale = Math.min(box / image.width, box / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, { x: cx - w / 2, y: y - h, width: w, height: h });
    y -= h + 5 * MM;
  }

  // Shop name.
  const name = pick(faces, shop.name.trim(), true);
  const fit = fitText(name.font, name.text, f.name, 16, maxWidth, 2);
  for (const line of fit.lines) {
    y -= fit.size;
    centered(page, name.font, line, fit.size, cx, y, ink);
    y -= fit.size * 0.25;
  }
  y -= 4 * MM;

  const hint = pick(faces, "Scan to call, message or find us", false);
  const hintSize = format === "a5" ? 15 : 12;
  y -= hintSize;
  centered(page, hint.font, hint.text, hintSize, cx, y, muted);
  y -= 8 * MM;

  // QR on white, centred in what is left above the footer.
  const qrTop = y;
  const total = f.qr * MM * ((matrix.length + 2 * QUIET_MODULES) / matrix.length);
  drawQr(page, matrix, cx - total / 2, qrTop, f.qr);
  y = qrTop - total - 7 * MM;

  const small = format === "a5" ? 12 : 10;
  const shown = url.replace(/^https?:\/\//, "");
  const address = pick(faces, shown, true);
  y -= small;
  centered(page, address.font, address.text, small, cx, y, ink);

  const bytes = await pdf.save({ useObjectStreams: false });
  return bytes;
}

function isPng(b: Uint8Array): boolean {
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

// ---- Sheet of unassigned codes -----------------------------------------------

export type StickerSize = "small" | "card" | "a5";
export const STICKER_SIZES: StickerSize[] = ["small", "card", "a5"];

// Cell size and QR width in mm. Every cell leaves at least 4 modules around the QR.
const CELLS: Record<StickerSize, { w: number; h: number; qr: number; label: string }> = {
  small: { w: 60, h: 60, qr: 40, label: "Small sticker" },
  card: { w: 4 * 25.4, h: 6 * 25.4, qr: 62, label: "4x6 card" },
  a5: { w: 148, h: 210, qr: 80, label: "A5 standee" },
};

export function parseStickerSize(raw: unknown): StickerSize {
  return STICKER_SIZES.find((s) => s === raw) ?? "card";
}

const A4 = { w: 210, h: 297 };
const SHEET_MARGIN = 5;

/** Cells per page on A4, trying both orientations. 0 columns means it does not fit. */
export function sheetGrid(size: StickerSize): { cols: number; rows: number; landscape: boolean } {
  const c = CELLS[size];
  const fit = (pw: number, ph: number) => ({
    cols: Math.floor((pw - 2 * SHEET_MARGIN) / c.w),
    rows: Math.floor((ph - 2 * SHEET_MARGIN) / c.h),
  });
  const portrait = fit(A4.w, A4.h);
  const landscape = fit(A4.h, A4.w);
  if (landscape.cols * landscape.rows > portrait.cols * portrait.rows) return { ...landscape, landscape: true };
  return { ...portrait, landscape: false };
}

export async function buildCodeSheet(
  size: StickerSize,
  codes: string[],
  baseUrl: string,
  fonts: PrintFonts,
): Promise<Uint8Array> {
  const c = CELLS[size];
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Unassigned QR codes - ${c.label}`);
  pdf.setProducer("QR shop pages");
  const faces = await loadFaces(pdf, fonts);

  const grid = sheetGrid(size);
  const perPage = grid.cols * grid.rows;
  // A cell too big for A4 gets a page of its own; the A5 standee fits A4, one to a page.
  const pageW = (perPage === 0 ? c.w : grid.landscape ? A4.h : A4.w) * MM;
  const pageH = (perPage === 0 ? c.h : grid.landscape ? A4.w : A4.h) * MM;
  const cols = perPage === 0 ? 1 : grid.cols;
  const rows = perPage === 0 ? 1 : grid.rows;
  const gridW = cols * c.w * MM;
  const gridH = rows * c.h * MM;
  const left = (pageW - gridW) / 2;
  const topEdge = pageH - (pageH - gridH) / 2;

  const list = codes.length > 0 ? codes : [];
  let page: PDFPage | null = null;
  list.forEach((code, i) => {
    const slot = i % (cols * rows);
    if (slot === 0) page = pdf.addPage([pageW, pageH]);
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const cellX = left + col * c.w * MM;
    const cellTop = topEdge - row * c.h * MM;
    drawCell(page!, faces, code, baseUrl, { x: cellX, top: cellTop, w: c.w * MM, h: c.h * MM, qrMm: c.qr });
  });
  if (!page) {
    const empty = pdf.addPage([pageW, pageH]);
    const t = pick(faces, "No unassigned codes in stock", true);
    centered(empty, t.font, t.text, 14, pageW / 2, pageH / 2);
  }
  return pdf.save({ useObjectStreams: false });
}

function drawCell(
  page: PDFPage,
  faces: Faces,
  code: string,
  baseUrl: string,
  cell: { x: number; top: number; w: number; h: number; qrMm: number },
) {
  const url = qrTarget(baseUrl, code);
  const matrix = qrMatrix(url);
  // Hairline around the cell: where to cut.
  page.drawRectangle({
    x: cell.x,
    y: cell.top - cell.h,
    width: cell.w,
    height: cell.h,
    borderColor: rgb(0.75, 0.77, 0.8),
    borderWidth: 0.5,
  });
  const quiet = (QUIET_MODULES * cell.qrMm * MM) / matrix.length;
  const total = cell.qrMm * MM + 2 * quiet;
  const label = pick(faces, code, true);
  const labelSize = Math.max(9, Math.min(20, cell.w / MM / 5));
  const blockH = total + labelSize * 1.6;
  const topY = cell.top - (cell.h - blockH) / 2;
  drawQr(page, matrix, cell.x + (cell.w - total) / 2, topY, cell.qrMm);
  centered(page, label.font, label.text, labelSize, cell.x + cell.w / 2, topY - total - labelSize * 1.2);
}
