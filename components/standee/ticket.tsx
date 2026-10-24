// Ticket: coupon card with a tear line, QR beside a list of what it opens.
// Positions follow the flex layout of docs/design/Standee.dc.html (560 x 794).
import type { Content, Ctx } from "./content.ts";
import { ItemIcon, Line, Lines, Logo, PoweredBy, Qr, Shadow, r } from "./parts.tsx";
import { fit, normalHeight } from "./text.ts";
import { HINT_TEXT } from "./types.ts";

export function Ticket({ c, p }: { c: Ctx; p: Content }) {
  const { t } = c;
  const card = { x: 30, y: 30, w: c.W - 60, h: c.H - 60 };
  const side = 34;
  const left = card.x + side;

  // Header: logo, name, tagline.
  const textW = card.w - 2 * side - 56 - 14;
  const name = fit(c.head, p.shopName, textW, [
    { lines: 1, max: 28, min: 20 },
    { lines: 2, max: 24, min: 18 },
  ]);
  const nameLine = name.size * 1.1;
  const tag = p.tagline ? fit(c.body, p.tagline, textW, [{ lines: 1, max: 14, min: 11 }]) : null;
  const tagH = tag ? 3 + normalHeight(c.body, tag.size) : 0;
  const textH = nameLine * name.lines.length + tagH;
  const rowH = Math.max(56, textH);
  const rowTop = card.y + 42;
  const rowMid = rowTop + rowH / 2;

  // Headline, then the tear line.
  const headline = fit(c.head, p.headline, card.w - 2 * side, [
    { lines: 2, max: 40, min: 34 },
    { lines: 3, max: 40, min: 30 },
  ]);
  const headLine = headline.size * 1.06;
  const headTop = rowTop + rowH + 14 + 18;
  const tearTop = headTop + headLine * headline.lines.length + 38;

  // QR on the left, one row per thing the code opens on the right.
  const n = p.items.length;
  const listH = n > 0 ? n * 40 + (n - 1) * 14 : 0;
  const boxSize = 248;
  const secTop = tearTop + 2 + 40;
  const secH = Math.max(listH, boxSize);
  const boxX = n > 0 ? card.x + 30 : c.W / 2 - boxSize / 2;
  const boxY = secTop + (secH - boxSize) / 2;
  const listX = boxX + boxSize + 20;
  const listTop = secTop + (secH - listH) / 2;
  const labelW = card.x + card.w - 30 - listX - 40 - 12;

  const hintTop = secTop + secH + 24;
  const hint = fit(c.body, HINT_TEXT, card.w - 2 * side, [{ lines: 1, max: 13, min: 10 }]);
  const footTop = card.y + card.h - 55;

  return (
    <>
      <rect x={-c.bleed} y={-c.bleed} width={c.W + 2 * c.bleed} height={c.H + 2 * c.bleed} fill={t.bg} />
      <Shadow x={card.x} y={card.y} w={card.w} h={card.h} radius={26} dy={14} blur={40} spread={-26} alpha={0.35} />
      <rect x={card.x} y={card.y} width={card.w} height={card.h} rx={26} fill={t.card} />

      <Logo c={c} cx={left + 28} cy={rowMid} radius={28} initials={p.initials} initialsSize={20} logoSrc={p.logoSrc} />
      <Lines c={c} face={c.head} size={name.size} x={left + 70} top={rowMid - textH / 2} lineHeight={nameLine} fill={t.text} lines={name.lines} />
      {tag ? (
        <Line c={c} face={c.body} size={tag.size} x={left + 70} top={rowMid - textH / 2 + nameLine * name.lines.length + 3} fill={t.muted}>
          {tag.lines[0]}
        </Line>
      ) : null}
      <Lines c={c} face={c.head} size={headline.size} x={left} top={headTop} lineHeight={headLine} fill={t.text} lines={headline.lines} />

      <line x1={card.x} y1={r(tearTop + 1)} x2={card.x + card.w} y2={r(tearTop + 1)} stroke={t.line} strokeWidth={2} strokeDasharray="6 6" />
      <circle cx={card.x} cy={r(tearTop + 2)} r={17} fill={t.bg} />
      <circle cx={card.x + card.w} cy={r(tearTop + 2)} r={17} fill={t.bg} />

      <rect x={boxX + 0.5} y={r(boxY + 0.5)} width={boxSize - 1} height={boxSize - 1} rx={17.5} fill="#FFFFFF" stroke={t.line} strokeWidth={1} />
      <Qr art={p.art} x={boxX + 11} y={boxY + 11} size={226} />

      {p.items.map((item, i) => {
        const top = listTop + i * 54;
        const label = fit(c.bodyBold, item.long, labelW, [
          { lines: 2, max: 14.5, min: 12.5 },
          { lines: 2, max: 12.5, min: 10 },
        ]);
        const lh = label.size * 1.25;
        return (
          <g key={`${item.type}-${i}`}>
            <rect x={r(listX)} y={r(top)} width={40} height={40} rx={12} fill={t.iconbg} />
            <ItemIcon type={item.type} x={listX + 10} y={top + 10} size={20} color={t.iconfg} />
            <Lines c={c} face={c.bodyBold} size={label.size} x={listX + 52} top={top + 20 - (lh * label.lines.length) / 2} lineHeight={lh} fill={t.text} lines={label.lines} />
          </g>
        );
      })}

      <Line c={c} face={c.body} size={hint.size} x={left} top={hintTop} fill={t.muted}>
        {hint.lines[0]}
      </Line>

      <line x1={card.x} y1={r(footTop + 0.5)} x2={card.x + card.w} y2={r(footTop + 0.5)} stroke={t.line} strokeWidth={1} />
      <PoweredBy c={c} cx={c.W / 2} cy={footTop + 1 + 16 + 10} />
    </>
  );
}
