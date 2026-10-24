// Text measuring and line breaking for the standee. The preview and the print
// files use these same numbers, so lines break in the same places on screen and
// on paper. Widths come from the generated table in metrics.ts.
import { type FaceId, faceForText } from "./faces.ts";
import { METRICS } from "./metrics.ts";

const metrics = (face: FaceId) => METRICS[face];

/** Width of `text` at `size`, with `spacing` extra after every character. */
export function measure(face: FaceId, size: number, text: string, spacing = 0): number {
  const f = faceForText(face, text);
  const m = metrics(f);
  let total = 0;
  for (const ch of text) total += (m.adv[ch.codePointAt(0)!] ?? m.def) * size + spacing;
  return total;
}

/** Height of a line box with `line-height: normal`. */
export function normalHeight(face: FaceId, size: number): number {
  const m = metrics(face);
  return (m.asc + m.desc) * size;
}

/** Space a line box keeps below its baseline. */
export function descent(face: FaceId, size: number): number {
  return metrics(face).desc * size;
}

/** Distance from the top of a line box (height `lineHeight`) to its baseline. */
export function baselineOffset(face: FaceId, size: number, lineHeight?: number): number {
  const m = metrics(face);
  const content = (m.asc + m.desc) * size;
  return ((lineHeight ?? content) - content) / 2 + m.asc * size;
}

export function wrap(face: FaceId, size: number, text: string, maxWidth: number, spacing = 0): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(face, size, next, spacing) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export type FitPlan = { lines: number; max: number; min: number };
export type Fitted = { size: number; lines: string[]; truncated: boolean };

/** Cut the last line until "..." fits. */
function ellipsize(face: FaceId, size: number, line: string, maxWidth: number): string {
  let cut = Array.from(line);
  while (cut.length > 1 && measure(face, size, `${cut.join("")}…`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.join("").trimEnd()}…`;
}

/**
 * The first plan whose text fits: that many lines at the biggest size from
 * `max` down to `min`. When none fits the last plan is used and the text is
 * shortened with an ellipsis, so nothing runs off the page.
 */
export function fit(face: FaceId, text: string, maxWidth: number, plans: FitPlan[]): Fitted {
  const clean = text.replace(/\s+/g, " ").trim();
  for (const plan of plans) {
    for (let size = plan.max; size >= plan.min; size -= 0.5) {
      const lines = wrap(face, size, clean, maxWidth);
      if (lines.length <= plan.lines && lines.every((l) => measure(face, size, l) <= maxWidth)) {
        return { size, lines, truncated: false };
      }
    }
  }
  const last = plans[plans.length - 1];
  const all = wrap(face, last.min, clean, maxWidth);
  const lines = all.slice(0, last.lines);
  // Cut text gets an ellipsis; so does a single word wider than the box.
  if (all.length > lines.length) lines[lines.length - 1] = `${lines[lines.length - 1]} …`;
  const shown = lines.map((l) => (measure(face, last.min, l) > maxWidth ? ellipsize(face, last.min, l, maxWidth) : l));
  return { size: last.min, lines: shown, truncated: true };
}
