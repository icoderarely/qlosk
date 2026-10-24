// The standee as an SVG string, for the print files. Uses the same components
// as the editor preview.
import { CodeCell, CodeSheetPage, type CodeCellProps, type CodeSheetPageProps } from "./code-sheet.tsx";
import { Standee, type StandeeProps, makeCtx } from "./standee.tsx";
import { toSvg } from "./to-svg.ts";

/**
 * The SVG with a drawn size of `width` x `height` (default: the drawing's own units).
 * The PDF passes its page size in points so the converter scales the drawing to the page.
 */
export function renderStandeeSvg(props: StandeeProps, drawn?: { width: number; height: number }): string {
  const c = makeCtx(props);
  const w = drawn?.width ?? c.W + 2 * c.bleed;
  const h = drawn?.height ?? c.H + 2 * c.bleed;
  return toSvg(<Standee {...props} width={w} height={h} />);
}

/** One sheet cell as a standalone SVG, so its QR can be decoded from a rendering. */
export function renderCodeCell(props: Omit<CodeCellProps, "x" | "y">): string {
  return toSvg(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${props.w} ${props.h}`} width={props.w} height={props.h}>
      <CodeCell {...props} x={0} y={0} />
    </svg>,
  );
}

/** `width` and `height` are the drawn size (a PDF passes points); the drawing itself is in millimetres. */
export function renderCodeSheetPage(props: CodeSheetPageProps): string {
  return toSvg(<CodeSheetPage {...props} />);
}
