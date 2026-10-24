// Badge: QR inside a circle with words around its edge.
// Positions follow the flex layout of docs/design/Standee.dc.html (560 x 794).
import type { Content, Ctx } from "./content.ts";
import { Line, Lines, Logo, PoweredBy, Qr, Shadow, T, r } from "./parts.tsx";
import { fit, measure, normalHeight } from "./text.ts";
import { HINT_TEXT } from "./types.ts";

const RING_WORDS = "SCAN · CALL · CHAT · REVIEW · FREE WI-FI · DIRECTIONS · OFFERS · ";
const RING_TEXT = RING_WORDS + RING_WORDS;
const RING_FACE = "manrope800" as const;
const RING_SIZE = 15;
const RING_SPACING = 3;
// The design sets textLength="1285" on a circle of radius 206 (circumference 1294).
const RING_LENGTH = 1285;
const RING_RADIUS = 206;

/** The ring's letters, each placed and turned on the circle, left of centre going clockwise. */
function RingText({ c, cx, cy }: { c: Ctx; cx: number; cy: number }) {
  const chars = Array.from(RING_TEXT);
  const advances = chars.map((ch) => measure(RING_FACE, RING_SIZE, ch));
  const natural = advances.reduce((a, b) => a + b, 0) + RING_SPACING * chars.length;
  const step = RING_SPACING + (RING_LENGTH - natural) / chars.length;
  let s = 0;
  return (
    <>
      {chars.map((ch, i) => {
        const mid = s + advances[i] / 2;
        s += advances[i] + step;
        if (ch === " ") return null;
        const phi = Math.PI + mid / RING_RADIUS;
        const x = cx + RING_RADIUS * Math.cos(phi);
        const y = cy + RING_RADIUS * Math.sin(phi);
        const deg = (phi * 180) / Math.PI + 90;
        return (
          <g key={i} transform={`rotate(${r(deg)} ${r(x)} ${r(y)})`}>
            <T c={c} face={RING_FACE} size={RING_SIZE} x={x} y={y} fill={c.t.iconfg} anchor="middle">
              {ch}
            </T>
          </g>
        );
      })}
    </>
  );
}

export function Badge({ c, p }: { c: Ctx; p: Content }) {
  const { t } = c;
  const cx = c.W / 2;
  const inner = c.W - 80;

  const headline = fit(c.head, p.headline, inner, [
    { lines: 1, max: 32, min: 24 },
    { lines: 2, max: 30, min: 22 },
  ]);
  const headLine = headline.size * 1.1;
  const headTop = 36 + 8;
  const hint = fit(c.body, HINT_TEXT, inner, [{ lines: 1, max: 14, min: 11 }]);
  const hintTop = headTop + headLine * headline.lines.length + 8;
  const discTop = hintTop + normalHeight(c.body, hint.size) + 26;
  const discCy = discTop + 235;

  const textW = inner - 58 - 14;
  const name = fit(c.head, p.shopName, textW, [
    { lines: 1, max: 28, min: 20 },
    { lines: 2, max: 24, min: 18 },
  ]);
  const nameLine = name.size * 1.1;
  const tag = p.tagline ? fit(c.body, p.tagline, textW, [{ lines: 1, max: 14, min: 11 }]) : null;
  const tagH = tag ? 2 + normalHeight(c.body, tag.size) : 0;
  const textH = nameLine * name.lines.length + tagH;
  const rowH = Math.max(58, textH);
  const rowTop = discTop + 470 + 30;
  const widest = Math.max(
    ...name.lines.map((l) => measure(c.head, name.size, l)),
    tag ? measure(c.body, tag.size, tag.lines[0]) : 0,
  );
  const rowW = 58 + 14 + widest;
  const rowLeft = cx - rowW / 2;
  const footTop = c.H - 26 - 35;

  return (
    <>
      <rect x={-c.bleed} y={-c.bleed} width={c.W + 2 * c.bleed} height={c.H + 2 * c.bleed} fill={t.card} />
      <Lines c={c} face={c.head} size={headline.size} x={cx} top={headTop} lineHeight={headLine} fill={t.text} anchor="middle" lines={headline.lines} />
      <Line c={c} face={c.body} size={hint.size} x={cx} top={hintTop} fill={t.muted} anchor="middle">
        {hint.lines[0]}
      </Line>

      <circle cx={cx} cy={r(discCy)} r={235} fill={t.bg} />
      <circle cx={cx} cy={r(discCy)} r={188} fill="none" stroke={t.iconfg} strokeWidth={1.5} strokeDasharray="2 6" strokeLinecap="round" />
      <RingText c={c} cx={cx} cy={discCy} />

      <Shadow x={cx - 145} y={discCy - 145} w={290} h={290} radius={26} dy={14} blur={30} spread={-18} alpha={0.4} />
      <rect x={cx - 145} y={r(discCy - 145)} width={290} height={290} rx={26} fill="#FFFFFF" />
      <Qr art={p.art} x={cx - 131} y={discCy - 131} size={262} />

      <Logo c={c} cx={rowLeft + 29} cy={rowTop + rowH / 2} radius={29} initials={p.initials} initialsSize={21} logoSrc={p.logoSrc} />
      <Lines c={c} face={c.head} size={name.size} x={rowLeft + 72} top={rowTop + rowH / 2 - textH / 2} lineHeight={nameLine} fill={t.text} lines={name.lines} />
      {tag ? (
        <Line c={c} face={c.body} size={tag.size} x={rowLeft + 72} top={rowTop + rowH / 2 - textH / 2 + nameLine * name.lines.length + 2} fill={t.muted}>
          {tag.lines[0]}
        </Line>
      ) : null}

      <line x1={40} y1={r(footTop + 0.5)} x2={c.W - 40} y2={r(footTop + 0.5)} stroke={t.line} strokeWidth={1} />
      <PoweredBy c={c} cx={cx} cy={footTop + 1 + 14 + 10} />
    </>
  );
}
