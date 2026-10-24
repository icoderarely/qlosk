// Pieces the three standee designs share. Every piece is a plain function of
// its props that returns SVG elements (no hooks), so the browser preview and
// the print files draw the very same markup.
import type { ReactNode } from "react";
import type { QrArt } from "../../services/qr-art.ts";
import { MARK_SHAPES, MARK_SPAN, QR_BORDER, QR_INK } from "../../services/qr-art.ts";
import type { Ctx } from "./content.ts";
import { type FaceId, faceForText } from "./faces.ts";
import { baselineOffset, measure, normalHeight } from "./text.ts";
import type { StandeeItem } from "./types.ts";

/** Round to 3 decimals so the markup stays short. */
export const r = (v: number) => Math.round(v * 1000) / 1000;

// ---- Text ----------------------------------------------------------------------

export function T({
  c,
  face,
  size,
  x,
  y,
  fill,
  anchor = "start",
  spacing,
  opacity,
  children,
}: {
  c: Ctx;
  face: FaceId;
  size: number;
  x: number;
  /** Baseline. */
  y: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
  opacity?: number;
  children: string;
}) {
  const style = c.faces[faceForText(face, children)];
  return (
    <text
      x={r(x)}
      y={r(y)}
      fontFamily={style.family}
      fontWeight={style.weight}
      fontSize={size}
      fill={fill}
      textAnchor={anchor === "start" ? undefined : anchor}
      letterSpacing={spacing ? r(spacing) : undefined}
      opacity={opacity}
    >
      {children}
    </text>
  );
}

/** One line whose line box has the given top, like a block in the design's CSS. */
export function Line({
  c,
  face,
  size,
  x,
  top,
  lineHeight,
  fill,
  anchor,
  spacing,
  opacity,
  children,
}: {
  c: Ctx;
  face: FaceId;
  size: number;
  x: number;
  top: number;
  lineHeight?: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
  opacity?: number;
  children: string;
}) {
  return (
    <T c={c} face={face} size={size} x={x} y={top + baselineOffset(face, size, lineHeight)} fill={fill} anchor={anchor} spacing={spacing} opacity={opacity}>
      {children}
    </T>
  );
}

/** Lines stacked from `top`, each `lineHeight` tall. */
export function Lines({
  c,
  face,
  size,
  x,
  top,
  lineHeight,
  fill,
  anchor,
  lines,
}: {
  c: Ctx;
  face: FaceId;
  size: number;
  x: number;
  top: number;
  lineHeight: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  lines: string[];
}) {
  return (
    <>
      {lines.map((text, i) => (
        <Line key={i} c={c} face={face} size={size} x={x} top={top + i * lineHeight} lineHeight={lineHeight} fill={fill} anchor={anchor}>
          {text}
        </Line>
      ))}
    </>
  );
}

// ---- Shapes --------------------------------------------------------------------

const erf = (x: number) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};

/**
 * A soft shadow under a rounded box, like the design's CSS box-shadow, built
 * from a few stacked translucent rectangles because PDF has no blur.
 * `spread` is negative for a shadow smaller than the box.
 */
export function Shadow({
  x,
  y,
  w,
  h,
  radius,
  dy,
  blur,
  spread,
  alpha,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  dy: number;
  blur: number;
  spread: number;
  alpha: number;
}) {
  const sigma = blur / 2;
  // Each layer is the box grown by d; together they approximate a gaussian edge.
  const steps = [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((k) => k * sigma);
  const cover = (d: number) => 0.5 * (1 - erf(d / (sigma * Math.SQRT2)));
  return (
    <>
      {steps.map((d, i) => {
        const next = i === steps.length - 1 ? Infinity : steps[i + 1];
        // Opacity added where this layer is the outermost one covering a point.
        const a = alpha * (cover(i === 0 ? -Infinity : (steps[i - 1] + d) / 2) - cover(i === steps.length - 1 ? Infinity : (d + next) / 2));
        const g = spread + d;
        const rx = Math.max(0, radius + g);
        return (
          <rect
            key={i}
            x={r(x - g)}
            y={r(y + dy - g)}
            width={r(Math.max(0, w + 2 * g))}
            height={r(Math.max(0, h + 2 * g))}
            rx={r(rx)}
            fill="#000"
            fillOpacity={r(Math.max(0, a))}
          />
        );
      })}
    </>
  );
}

/** Rounded box with different corner radii (CSS border-radius with circular corners). */
export function boxPath(x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): string {
  return (
    `M${r(x)} ${r(y + tl)}A${tl} ${tl} 0 0 1 ${r(x + tl)} ${r(y)}H${r(x + w - tr)}A${tr} ${tr} 0 0 1 ${r(x + w)} ${r(y + tr)}` +
    `V${r(y + h - br)}A${br} ${br} 0 0 1 ${r(x + w - br)} ${r(y + h)}H${r(x + bl)}A${bl} ${bl} 0 0 1 ${r(x)} ${r(y + h - bl)}Z`
  );
}

// ---- Logo and initials ---------------------------------------------------------

export function Logo({
  c,
  cx,
  cy,
  radius,
  initials,
  initialsSize,
  logoSrc,
}: {
  c: Ctx;
  cx: number;
  cy: number;
  radius: number;
  initials: string;
  initialsSize: number;
  logoSrc?: string | null;
}) {
  if (logoSrc) {
    const side = radius * 1.6;
    return (
      <g>
        <defs>
          <clipPath id="standee-logo-clip">
            <circle cx={r(cx)} cy={r(cy)} r={radius} />
          </clipPath>
        </defs>
        <circle cx={r(cx)} cy={r(cy)} r={radius - 0.5} fill="#FFFFFF" stroke={c.t.line} strokeWidth={1} />
        <image
          href={logoSrc}
          x={r(cx - side / 2)}
          y={r(cy - side / 2)}
          width={r(side)}
          height={r(side)}
          preserveAspectRatio="xMidYMid meet"
          clipPath="url(#standee-logo-clip)"
        />
      </g>
    );
  }
  return (
    <g role="img" aria-label="Shop logo">
      <circle cx={r(cx)} cy={r(cy)} r={radius} fill={c.t.btn} />
      <T c={c} face={c.head} size={initialsSize} x={cx} y={cy - normalHeight(c.head, initialsSize) / 2 + baselineOffset(c.head, initialsSize)} fill={c.t.btntext} anchor="middle">
        {initials}
      </T>
    </g>
  );
}

// ---- QR code -------------------------------------------------------------------

/** The Q mark in the middle of the code: near-black, no tile (module units). */
function QMark({ mark }: { mark: QrArt["mark"] }) {
  const s = mark.size / MARK_SPAN.size;
  const { frame, dot, tail } = MARK_SHAPES;
  return (
    <g transform={`translate(${r(mark.x - MARK_SPAN.from * s)} ${r(mark.y - MARK_SPAN.from * s)}) scale(${r(s * 10000) / 10000})`}>
      <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} rx={frame.rx} fill="none" stroke={QR_INK} strokeWidth={frame.strokeWidth} />
      <rect x={dot.x} y={dot.y} width={dot.width} height={dot.height} rx={dot.rx} fill={QR_INK} />
      <rect x={tail.x} y={tail.y} width={tail.width} height={tail.height} rx={tail.rx} fill={QR_INK} stroke="#FFFFFF" strokeWidth={tail.strokeWidth} />
    </g>
  );
}

/**
 * The code, `size` units square including its 2-module white border, with its
 * top-left at (x, y). Always dark on white, whatever the theme.
 */
export function Qr({ art, x, y, size }: { art: QrArt; x: number; y: number; size: number }) {
  const total = art.modules + 2 * QR_BORDER;
  return (
    <g role="img" aria-label="QR code" transform={`translate(${r(x)} ${r(y)}) scale(${r((size / total) * 100000) / 100000})`}>
      <rect width={total} height={total} fill="#FFFFFF" />
      <g transform={`translate(${QR_BORDER} ${QR_BORDER})`}>
        <path d={art.path} fill={QR_INK} />
        <QMark mark={art.mark} />
      </g>
    </g>
  );
}

// ---- Icons ---------------------------------------------------------------------

// 24-unit icons, 2-unit round strokes. Paths for review, Wi-Fi, WhatsApp, call
// and offer are from docs/design/Standee.dc.html; the rest follow the same style
// as components/shop-page/icons.tsx.
const ICON_PATHS: Record<StandeeItem["type"], ReactNode> = {
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  whatsapp: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z" />,
  google_review: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  wifi: <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.01" />,
  maps: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5v.01" />
    </>
  ),
  facebook: <path d="M15 4h-2a4 4 0 0 0-4 4v3H6v4h3v6h4v-6h3l1-4h-4V8a1 1 0 0 1 1-1h2z" />,
  youtube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9l5 3-5 3z" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  menu: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  custom: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  offer: (
    <>
      <path d="M20 12l-8 8-9-9V3h8z" />
      <path d="M7.5 7.5v.01" />
    </>
  ),
};

export function ItemIcon({ type, x, y, size, color }: { type: StandeeItem["type"]; x: number; y: number; size: number; color: string }) {
  return (
    <g
      transform={`translate(${r(x)} ${r(y)}) scale(${r((size / 24) * 10000) / 10000})`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[type]}
    </g>
  );
}

// ---- Credit line ---------------------------------------------------------------

/** The Qlosk mark on its butter tile (spec section 11), `size` units square. */
export function BrandTile({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${r(x)} ${r(y)}) scale(${r(size / 48)})`}>
      <rect width="48" height="48" rx="14" fill="#FBF1B5" />
      <rect x="9" y="9" width="26" height="26" rx="9" fill="none" stroke="#0D1F1B" strokeWidth="6" />
      <rect x="18" y="18" width="8" height="8" rx="2" fill="#0D1F1B" />
      <rect x="28.5" y="28.5" width="12" height="12" rx="3.2" fill="#0D1F1B" stroke="#FBF1B5" strokeWidth="3" />
    </g>
  );
}

/** "Powered by [mark] Qlosk · qlosk.com", centred on (cx, cy). */
export function PoweredBy({ c, cx, cy }: { c: Ctx; cx: number; cy: number }) {
  const gap = 8;
  const small = 12;
  const word = 16;
  const spacing = -0.02 * word;
  const parts = [
    { w: measure("manrope600", small, "Powered by") },
    { w: 20 },
    { w: measure("fraunces700", word, "Qlosk", spacing) },
    { w: measure("manrope600", small, "·") },
    { w: measure("manrope600", small, "qlosk.com") },
  ];
  const total = parts.reduce((a, p) => a + p.w, 0) + gap * (parts.length - 1);
  let x = cx - total / 2;
  const xs = parts.map((p) => {
    const at = x;
    x += p.w + gap;
    return at;
  });
  const base = (face: FaceId, size: number) => cy - normalHeight(face, size) / 2 + baselineOffset(face, size);
  return (
    <g>
      <T c={c} face="manrope600" size={small} x={xs[0]} y={base("manrope600", small)} fill={c.t.muted}>
        Powered by
      </T>
      <BrandTile x={xs[1]} y={cy - 10} size={20} />
      <T c={c} face="fraunces700" size={word} x={xs[2]} y={base("fraunces700", word)} fill={c.t.muted} spacing={spacing}>
        Qlosk
      </T>
      <T c={c} face="manrope600" size={small} x={xs[3]} y={base("manrope600", small)} fill={c.t.muted} opacity={0.6}>
        ·
      </T>
      <T c={c} face="manrope600" size={small} x={xs[4]} y={base("manrope600", small)} fill={c.t.muted}>
        qlosk.com
      </T>
    </g>
  );
}
