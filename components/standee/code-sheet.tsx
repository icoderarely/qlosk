// A sheet of QR codes for stock that has no shop yet (spec section 8): each code
// in a cell with its letters under it, drawn with the same QR rules as the
// standees. Units are millimetres. Plain functions of their props, like the
// standee, so services/print.ts can turn them into SVG and then a PDF.
import type { QrArt } from "../../services/qr-art.ts";
import { THEMES } from "../shop-page/themes.ts";
import type { Ctx } from "./content.ts";
import type { FaceMap } from "./faces.ts";
import { Line, Qr, r } from "./parts.tsx";
import { QR_BORDER } from "../../services/qr-art.ts";

const MM_PER_PT = 25.4 / 72;

function sheetCtx(faces: FaceMap, w: number, h: number): Ctx {
  return { t: THEMES.graphite, faces, head: "dmsans700", body: "dmsans400", bodyBold: "dmsans700", W: w, H: h, bleed: 0 };
}

export type CodeCellProps = {
  faces: FaceMap;
  code: string;
  art: QrArt;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Width of the code's modules in mm; its 2-module border is added around it. */
  qrMm: number;
};

export function CodeCell({ faces, code, art, x, y, w, h, qrMm }: CodeCellProps) {
  const c = sheetCtx(faces, w, h);
  const total = (qrMm * (art.modules + 2 * QR_BORDER)) / art.modules;
  const label = Math.max(9, Math.min(20, w / 5)) * MM_PER_PT; // pt to mm
  const block = total + label * 1.6;
  const top = y + (h - block) / 2;
  return (
    <g>
      {/* Hairline around the cell: where to cut. */}
      <rect x={r(x)} y={r(y)} width={r(w)} height={r(h)} fill="#FFFFFF" stroke="#BFC4CC" strokeWidth={0.18} />
      <Qr art={art} x={x + (w - total) / 2} y={top} size={total} />
      <Line c={c} face="dmsans700" size={label} x={x + w / 2} top={top + total + label * 0.2} fill="#16181D" anchor="middle">
        {code}
      </Line>
    </g>
  );
}

export type CodeSheetPageProps = {
  faces: FaceMap;
  pageW: number;
  pageH: number;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  qrMm: number;
  cells: { code: string; art: QrArt }[];
  /** Drawn size; defaults to the page size in millimetres. */
  width?: number;
  height?: number;
};

export function CodeSheetPage({ faces, pageW, pageH, cols, rows, cellW, cellH, qrMm, cells, width, height }: CodeSheetPageProps) {
  const left = (pageW - cols * cellW) / 2;
  const top = (pageH - rows * cellH) / 2;
  const c = sheetCtx(faces, pageW, pageH);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${r(pageW)} ${r(pageH)}`} width={r(width ?? pageW)} height={r(height ?? pageH)}>
      <rect width={r(pageW)} height={r(pageH)} fill="#FFFFFF" />
      {cells.length === 0 ? (
        <Line c={c} face="dmsans700" size={5} x={pageW / 2} top={pageH / 2 - 3} fill="#16181D" anchor="middle">
          No unassigned codes in stock
        </Line>
      ) : null}
      {cells.map((cell, i) => (
        <CodeCell
          key={cell.code}
          faces={faces}
          code={cell.code}
          art={cell.art}
          x={left + (i % cols) * cellW}
          y={top + Math.floor(i / cols) * cellH}
          w={cellW}
          h={cellH}
          qrMm={qrMm}
        />
      ))}
    </svg>
  );
}
