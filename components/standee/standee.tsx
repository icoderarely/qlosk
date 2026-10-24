// The standee: one SVG, drawn from plain data. The editor preview shows it in
// the browser and the print routes turn the same markup into the PDF and PNG
// (services/print.ts), so what you see is what prints.
import { THEMES } from "../shop-page/themes.ts";
import type { FontId } from "../shop-page/types.ts";
import { Arch } from "./arch.tsx";
import { Badge } from "./badge.tsx";
import type { Content, Ctx } from "./content.ts";
import { FACE_PACKS, type FaceMap } from "./faces.ts";
import { Ticket } from "./ticket.tsx";
import {
  CANVAS_W,
  type StandeeDesign,
  type StandeeLightTheme,
  type StandeeSize,
  bleedUnits,
  canvasHeight,
} from "./types.ts";

export type StandeeProps = {
  design: StandeeDesign;
  theme: StandeeLightTheme;
  font: FontId;
  size: StandeeSize;
  content: Content;
  /** How each face is named where this is drawn (the browser's loaded fonts, or the font files). */
  faces: FaceMap;
  /** Paint the 3 mm bleed past the trim edge (print PDF only). */
  bleed?: boolean;
  /** Drawn size. The preview fills its box; the print files use the drawing's own units. */
  width?: number | string;
  height?: number | string;
};

export function makeCtx(p: Pick<StandeeProps, "theme" | "font" | "size" | "faces" | "bleed">): Ctx {
  const pack = FACE_PACKS[p.font];
  return {
    t: THEMES[p.theme],
    faces: p.faces,
    head: pack.head,
    body: pack.body,
    bodyBold: pack.bodyBold,
    W: CANVAS_W,
    H: canvasHeight(p.size),
    bleed: p.bleed ? bleedUnits(p.size) : 0,
  };
}

export function Standee(props: StandeeProps) {
  const c = makeCtx(props);
  const b = c.bleed;
  const Design = { arch: Arch, ticket: Ticket, badge: Badge }[props.design];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-b} ${-b} ${c.W + 2 * b} ${c.H + 2 * b}`}
      width={props.width ?? "100%"}
      height={props.height}
      role="img"
      aria-label={`${props.content.shopName} standee`}
    >
      <Design c={c} p={props.content} />
    </svg>
  );
}
