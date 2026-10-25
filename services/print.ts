// Print files (spec sections 8, 9 and 11, slice 6): the standee as a print PDF and
// a WhatsApp PNG, and a sheet of unassigned codes. All of them are drawn from the
// same React components as the editor preview (components/standee), so what you
// see is what prints. The QR is vector, error correction H, with the Q mark in
// the middle (services/qr-art.ts).
//
// Before any file is returned, the QR is decoded back out of a rendered image and
// must read exactly QR_BASE_URL/q/<code>; if it does not, nothing is returned.
// The PNG is decoded as it is. The PDF is opened and drawn by a PDF renderer (the
// same kind of engine a phone or printer driver uses) and the QR is read from that.
// Fonts come in as bytes and file paths so this file needs no Next.js; loading
// them is lib/print-assets.ts.
import { createCanvas } from "@napi-rs/canvas";
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import PDFDocument from "pdfkit";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import SVGtoPDF from "svg-to-pdfkit";
import type { Content } from "../components/standee/content.ts";
import { FILE_FACES, type FaceId, type FaceMap } from "../components/standee/faces.ts";
import { renderCodeCell, renderCodeSheetPage, renderStandeeSvg } from "../components/standee/render.tsx";
import type { StandeeProps } from "../components/standee/standee.tsx";
import {
  BLEED_MM,
  SIZE_MM,
  type StandeeDesign,
  type StandeeLightTheme,
  type StandeeSize,
} from "../components/standee/types.ts";
import type { FontId } from "../components/shop-page/types.ts";
import { buildQrArt, qrTarget, type QrArt } from "./qr-art.ts";

export { qrSvg, qrTarget } from "./qr-art.ts";

export const MM = 72 / 25.4; // PDF points per millimetre
export { BLEED_MM };
export const MIN_QR_MM = 30;
export const PNG_WIDTH = 1080;
/** Width the QR is checked at: 20 px or more per module for every code we make. */
const CHECK_WIDTH = 1600;
/**
 * jsQR's finder search is sensitive to the exact pixel grid, so a code that reads at most
 * sizes can fail at one (the round badge with a two-line headline fails at 1600). The check
 * draws at these widths in turn and passes when one reads; a wrong address always fails.
 */
const CHECK_WIDTHS = [CHECK_WIDTH, 1400, 2000, 1200, 1800];
/** The PDF is drawn at 3 pixels per point (216 dpi) for its check: about 18 px per module. */
const PDF_CHECK_SCALE = 3;

export type PrintFonts = {
  /** Font file bytes, for the PDF. */
  bytes: Record<FaceId, Uint8Array>;
  /** The same files as paths, for the image renderer. */
  files: string[];
};

export class QrCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrCheckError";
  }
}

// ---- Rendering and the QR check ----------------------------------------------------

export function renderPng(svg: string, width: number, fonts: PrintFonts): Uint8Array {
  const resvg = new Resvg(svg, {
    font: { fontFiles: fonts.files, loadSystemFonts: false, defaultFontFamily: "DM Sans" },
    fitTo: { mode: "width", value: width },
    background: "#FFFFFF",
  });
  return resvg.render().asPng();
}

type Pixels = { data: Uint8ClampedArray; width: number; height: number };

function readPixels({ data, width, height }: Pixels): string | null {
  return jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

/** What a phone would read from this image, or null if nothing reads. */
export async function readQr(png: Uint8Array): Promise<string | null> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return readPixels({ data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height });
}

/** Draws one page of a PDF to pixels, the way a viewer or print driver would. */
export async function rasterisePdf(pdf: Uint8Array, pageNumber: number, scale: number): Promise<Pixels> {
  // pdf.js takes ownership of the bytes it is given, so give it a copy.
  const task = pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false });
  try {
    const page = await (await task.promise).getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx as never, viewport, canvas: canvas as never }).promise;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { data: new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.length), width: image.width, height: image.height };
  } finally {
    await task.destroy();
  }
}

/** What a phone would read from page `pageNumber` of this PDF, drawn at `scale` pixels per point. */
export async function readPdfQr(pdf: Uint8Array, pageNumber = 1, scale = PDF_CHECK_SCALE): Promise<string | null> {
  return readPixels(await rasterisePdf(pdf, pageNumber, scale));
}

/** The part of an image inside a rectangle (pixels). */
function crop(img: Pixels, x: number, y: number, w: number, h: number): Pixels {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const cw = Math.min(img.width - x0, Math.ceil(w));
  const ch = Math.min(img.height - y0, Math.ceil(h));
  const data = new Uint8ClampedArray(cw * ch * 4);
  for (let row = 0; row < ch; row++) {
    const from = ((y0 + row) * img.width + x0) * 4;
    data.set(img.data.subarray(from, from + cw * 4), row * cw * 4);
  }
  return { data, width: cw, height: ch };
}

/** Throws QrCheckError unless the image's QR reads back exactly `expected`. */
export async function assertQrReads(png: Uint8Array, expected: string, what: string): Promise<void> {
  const got = await readQr(png);
  if (got === null) throw new QrCheckError(`The QR code in the ${what} could not be read back. Nothing was saved.`);
  if (got !== expected) {
    throw new QrCheckError(`The QR code in the ${what} reads ${got} instead of ${expected}. Nothing was saved.`);
  }
}

// ---- Standee -----------------------------------------------------------------------

export type StandeeInput = {
  design: StandeeDesign;
  theme: StandeeLightTheme;
  font: FontId;
  size: StandeeSize;
  /** Everything drawn, QR included; content.art.url is what the code must read back. */
  content: Content;
};

function standeeProps(input: StandeeInput, bleed: boolean, faces: FaceMap = FILE_FACES): StandeeProps {
  return { ...input, faces, bleed };
}

export function standeeFileName(kind: "pdf" | "png", code: string, input: Pick<StandeeInput, "design" | "size">): string {
  return `standee-${input.design}-${input.size.toLowerCase()}-${code}.${kind}`;
}

/** Decodes the QR from a rendering of this very standee. Used before saving and by the preview's "QR checked" line. */
export async function checkStandeeQr(input: StandeeInput, fonts: PrintFonts): Promise<void> {
  const svg = renderStandeeSvg(standeeProps(input, false));
  const expected = input.content.art.url;
  for (const width of CHECK_WIDTHS) {
    const got = await readQr(renderPng(svg, width, fonts));
    if (got === null) continue;
    if (got !== expected) throw new QrCheckError(`The QR code in the standee reads ${got} instead of ${expected}. Nothing was saved.`);
    return;
  }
  throw new QrCheckError("The QR code in the standee could not be read back. Nothing was saved.");
}

/** 1080 px wide PNG of the standee, for WhatsApp. The PNG itself is what gets decoded. */
export async function buildStandeePng(input: StandeeInput, fonts: PrintFonts): Promise<Uint8Array> {
  const png = renderPng(renderStandeeSvg(standeeProps(input, false)), PNG_WIDTH, fonts);
  await assertQrReads(png, input.content.art.url, "PNG");
  return png;
}

type Doc = InstanceType<typeof PDFDocument>;

/** Runs a PDFKit document to the end and collects its bytes. */
function collect(doc: Doc): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
  });
}

/** Registers the font files and tells the SVG converter which one each family and weight means. */
function embedFonts(doc: Doc, fonts: PrintFonts) {
  const byKey = new Map<string, FaceId>();
  for (const id of Object.keys(FILE_FACES) as FaceId[]) {
    doc.registerFont(id, fonts.bytes[id]);
    const { family, weight } = FILE_FACES[id];
    byKey.set(`${family}|${weight >= 600 ? "b" : "n"}`, id);
  }
  return (family: string, bold: boolean): string => {
    const key = `${family.replace(/["']/g, "").trim()}|${bold ? "b" : "n"}`;
    const id = byKey.get(key);
    if (!id) throw new Error(`No embedded font for ${family}${bold ? " bold" : ""}.`);
    return id;
  };
}

function drawSvg(doc: Doc, svg: string, widthPt: number, heightPt: number, fontFor: ReturnType<typeof embedFonts>) {
  const warnings: string[] = [];
  SVGtoPDF(doc, svg, 0, 0, {
    width: widthPt,
    height: heightPt,
    assumePt: true,
    fontCallback: fontFor,
    warningCallback: (w: string) => warnings.push(w),
  });
  // A warning means something in the drawing did not reach the PDF.
  if (warnings.length > 0) throw new Error(`The PDF could not draw everything: ${warnings[0]}`);
}

/** Print PDF at the chosen size plus 3 mm bleed; text embedded, QR as vector paths. */
export async function buildStandeePdf(input: StandeeInput, fonts: PrintFonts, title = "Standee"): Promise<Uint8Array> {
  const { w, h } = SIZE_MM[input.size];
  const pageW = (w + 2 * BLEED_MM) * MM;
  const pageH = (h + 2 * BLEED_MM) * MM;
  const doc = new PDFDocument({
    size: [pageW, pageH],
    margin: 0,
    info: { Title: title, Author: "Qlosk", Producer: "Qlosk", Creator: "Qlosk" },
  });
  const done = collect(doc);
  const fontFor = embedFonts(doc, fonts);
  drawSvg(doc, renderStandeeSvg(standeeProps(input, true), { width: pageW, height: pageH }), pageW, pageH, fontFor);

  // Tell the printer where to cut: the trim box sits 3 mm inside the page.
  const b = BLEED_MM * MM;
  const page = doc.page as unknown as { dictionary: { data: Record<string, number[]> } };
  page.dictionary.data.TrimBox = [b, b, pageW - b, pageH - b];
  page.dictionary.data.BleedBox = [0, 0, pageW, pageH];
  doc.end();
  const bytes = await done;

  // Open the finished PDF, draw it and read the QR out of the picture.
  const got = await readPdfQr(bytes);
  const expected = input.content.art.url;
  if (got === null) throw new QrCheckError("The QR code in the PDF could not be read back. Nothing was saved.");
  if (got !== expected) throw new QrCheckError(`The QR code in the PDF reads ${got} instead of ${expected}. Nothing was saved.`);
  return bytes;
}

// ---- Sheet of unassigned codes -----------------------------------------------------

export type StickerSize = "small" | "card" | "a5";
export const STICKER_SIZES: StickerSize[] = ["small", "card", "a5"];

// Cell size in mm, and the width of the QR's modules (its 2-module border comes on top).
const CELLS: Record<StickerSize, { w: number; h: number; qr: number; label: string }> = {
  small: { w: 60, h: 60, qr: 40, label: "Small sticker" },
  card: { w: 4 * 25.4, h: 6 * 25.4, qr: 62, label: "4x6 card" },
  a5: { w: SIZE_MM.A5.w, h: SIZE_MM.A5.h, qr: 80, label: "A5 standee" },
};

export function parseStickerSize(raw: unknown): StickerSize {
  return STICKER_SIZES.find((s) => s === raw) ?? "card";
}

const A4 = { w: SIZE_MM.A4.w, h: SIZE_MM.A4.h };
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

export const SHEET_CHECK_WIDTH = 480;
const SHEET_PDF_SCALE = 2;

/**
 * PDF of the codes in stock, one QR per cell with its code under it. Every code
 * is decoded from a rendering of its own cell first.
 */
export async function buildCodeSheet(
  size: StickerSize,
  codes: string[],
  baseUrl: string,
  fonts: PrintFonts,
  makeArt: (url: string) => QrArt = buildQrArt,
): Promise<Uint8Array> {
  const c = CELLS[size];
  const grid = sheetGrid(size);
  const perPage = grid.cols * grid.rows;
  // A cell too big for A4 gets a page of its own; the A5 standee fits A4, one to a page.
  const pageW = perPage === 0 ? c.w : grid.landscape ? A4.h : A4.w;
  const pageH = perPage === 0 ? c.h : grid.landscape ? A4.w : A4.h;
  const cols = perPage === 0 ? 1 : grid.cols;
  const rows = perPage === 0 ? 1 : grid.rows;

  const cells = codes.map((code) => {
    const art = makeArt(qrTarget(baseUrl, code));
    return { code, art };
  });

  // Decode every code from its own rendered cell before anything is built.
  for (const cell of cells) {
    const svg = renderCodeCell({ faces: FILE_FACES, code: cell.code, art: cell.art, w: c.w, h: c.h, qrMm: c.qr });
    await assertQrReads(renderPng(svg, SHEET_CHECK_WIDTH, fonts), cell.art.url, `sheet cell for ${cell.code}`);
  }

  const doc = new PDFDocument({
    size: [pageW * MM, pageH * MM],
    margin: 0,
    autoFirstPage: false,
    info: { Title: `Unassigned QR codes - ${c.label}`, Author: "Qlosk", Producer: "Qlosk", Creator: "Qlosk" },
  });
  const done = collect(doc);
  const fontFor = embedFonts(doc, fonts);
  const perSheet = cols * rows;
  const pages = Math.max(1, Math.ceil(cells.length / perSheet));
  for (let p = 0; p < pages; p++) {
    doc.addPage({ size: [pageW * MM, pageH * MM], margin: 0 });
    const svg = renderCodeSheetPage({
      faces: FILE_FACES,
      pageW,
      pageH,
      cols,
      rows,
      cellW: c.w,
      cellH: c.h,
      qrMm: c.qr,
      cells: cells.slice(p * perSheet, (p + 1) * perSheet),
      width: pageW * MM,
      height: pageH * MM,
    });
    drawSvg(doc, svg, pageW * MM, pageH * MM, fontFor);
  }
  doc.end();
  const bytes = await done;

  // Every code was read from its own cell above. The finished PDF is also drawn
  // and its first page read cell by cell, which catches a fault in the PDF itself.
  const first = cells.slice(0, perSheet);
  if (first.length > 0) {
    const scale = SHEET_PDF_SCALE;
    const picture = await rasterisePdf(bytes, 1, scale);
    const left = (pageW - cols * c.w) / 2;
    const top = (pageH - rows * c.h) / 2;
    for (const [i, cell] of first.entries()) {
      const x = (left + (i % cols) * c.w) * MM * scale;
      const y = (top + Math.floor(i / cols) * c.h) * MM * scale;
      const got = readPixels(crop(picture, x, y, c.w * MM * scale, c.h * MM * scale));
      if (got !== cell.art.url) {
        throw new QrCheckError(`The QR code for ${cell.code} on the sheet PDF reads ${got ?? "nothing"} instead of ${cell.art.url}. Nothing was saved.`);
      }
    }
  }
  return bytes;
}
