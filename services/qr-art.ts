// The QR code as it is printed (spec sections 8 and 11). One place makes the
// matrix, so the standees, the sheet, the SVG download and the admin thumbnails
// all follow the same rules:
//   - encodes QR_BASE_URL/q/<code> only
//   - error correction H
//   - dark #0D1F1B on white, never coloured, drawn as vector paths
//   - 2-module white border (inside a white card)
//   - the middle 9 x 9 modules are cleared and hold the Qlosk Q mark, near-black,
//     no tile, about 1.5 modules of white around it; the corner squares stay dark
// No Next.js imports.
import qrcode from "qrcode-generator";
import { isValidCode } from "./qr.ts";

export const QR_INK = "#0D1F1B";
export const QR_BORDER = 2;
export const QR_CLEAR = 9;
/** The mark is the cleared square less 1.5 modules of white on each side. */
export const QR_MARK = QR_CLEAR - 2 * 1.5;
/** Past version 6 an alignment pattern would sit in the middle, under the mark. */
export const QR_MAX_MODULES = 41;

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

/** Dark modules as rows of booleans, error correction H, before the middle is cleared. */
export function rawMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "H");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  if (n > QR_MAX_MODULES) throw new Error("The QR address is too long for the standee. Use a shorter domain.");
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** Light modules in the middle QR_CLEAR x QR_CLEAR square. */
export function clearCentre(matrix: boolean[][]): boolean[][] {
  const n = matrix.length;
  const from = (n - QR_CLEAR) / 2;
  return matrix.map((row, r) =>
    row.map((dark, c) => dark && !(r >= from && r < from + QR_CLEAR && c >= from && c < from + QR_CLEAR)),
  );
}

export type QrArt = {
  /** What the code encodes. */
  url: string;
  /** Modules per side. */
  modules: number;
  /** The dark modules as one path in module units, origin at the first module. */
  path: string;
  /** The Q mark's square, in module units. */
  mark: { x: number; y: number; size: number };
};

const num = (v: number) => String(Math.round(v * 1000) / 1000);

/** Runs of dark modules, one rectangle each. */
function pathOf(matrix: boolean[][]): string {
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
      d += `M${start} ${r}h${c - start}v1h${start - c}z`;
    }
  });
  return d;
}

/** Art from a matrix that is already cleared. Tests use it to print a damaged code. */
export function artFromMatrix(url: string, matrix: boolean[][]): QrArt {
  const n = matrix.length;
  const x = (n - QR_MARK) / 2;
  return { url, modules: n, path: pathOf(matrix), mark: { x, y: x, size: QR_MARK } };
}

export function buildQrArt(url: string): QrArt {
  return artFromMatrix(url, clearCentre(rawMatrix(url)));
}

// The Q mark of docs/design/Logo.dc.html / qlosk-icon.svg, without its butter
// tile. In the 48 grid the mark spans 6 to 42; the gap that separates the tail
// from the frame is white here, because the code sits on white.
export const MARK_SPAN = { from: 6, size: 36 };
export const MARK_SHAPES = {
  frame: { x: 9, y: 9, width: 26, height: 26, rx: 9, strokeWidth: 6 },
  dot: { x: 18, y: 18, width: 8, height: 8, rx: 2 },
  tail: { x: 28.5, y: 28.5, width: 12, height: 12, rx: 3.2, strokeWidth: 3 },
};

/** SVG markup for the mark, placed in module units. */
function markSvg(mark: QrArt["mark"]): string {
  const s = mark.size / MARK_SPAN.size;
  const { frame, dot, tail } = MARK_SHAPES;
  return (
    `<g transform="translate(${num(mark.x - MARK_SPAN.from * s)} ${num(mark.y - MARK_SPAN.from * s)}) scale(${num(s)})">` +
    `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${frame.rx}" fill="none" stroke="${QR_INK}" stroke-width="${frame.strokeWidth}"/>` +
    `<rect x="${dot.x}" y="${dot.y}" width="${dot.width}" height="${dot.height}" rx="${dot.rx}" fill="${QR_INK}"/>` +
    `<rect x="${tail.x}" y="${tail.y}" width="${tail.width}" height="${tail.height}" rx="${tail.rx}" fill="${QR_INK}" stroke="#fff" stroke-width="${tail.strokeWidth}"/>` +
    `</g>`
  );
}

/** The QR on its own white card, border included, as a standalone SVG. */
export function qrArtSvg(art: QrArt): string {
  const size = art.modules + 2 * QR_BORDER;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<g transform="translate(${QR_BORDER} ${QR_BORDER})"><path d="${art.path}" fill="${QR_INK}"/>${markSvg(art.mark)}</g></svg>`
  );
}

/** Standalone SVG for one address. */
export function qrSvg(url: string): string {
  return qrArtSvg(buildQrArt(url));
}
