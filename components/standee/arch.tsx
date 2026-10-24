// Arch: rounded panel with logo, name, QR and an icon row.
// Positions follow the flex layout of docs/design/Standee.dc.html (560 x 794).
import { ItemIcon, Line, Lines, Logo, PoweredBy, Qr, Shadow, boxPath, r } from "./parts.tsx";
import type { Content, Ctx } from "./content.ts";
import { descent, fit, measure, normalHeight } from "./text.ts";

export function Arch({ c, p }: { c: Ctx; p: Content }) {
  const { t } = c;
  const cx = c.W / 2;
  const panel = { x: 50, w: 460, top: 36, side: 30 };
  const inner = panel.w - 2 * panel.side;

  const name = fit(c.head, p.shopName, inner, [
    { lines: 1, max: 30, min: 22 },
    { lines: 2, max: 26, min: 20 },
  ]);
  const nameLine = name.size * 1.1;
  const tag = p.tagline ? fit(c.body, p.tagline, inner, [{ lines: 1, max: 14, min: 11 }]) : null;
  const headline = fit(c.head, p.headline, inner, [
    { lines: 1, max: 21, min: 16 },
    { lines: 2, max: 19, min: 15 },
  ]);
  const headLine = normalHeight(c.head, headline.size);

  // Flex column, gap 8: each block's margin-top is added to the gap.
  let y = panel.top + 56;
  const logoCy = y + 30;
  y += 60 + 8 + 6;
  const nameTop = y;
  y += nameLine * name.lines.length;
  let tagTop = 0;
  if (tag) {
    y += 8;
    tagTop = y;
    y += normalHeight(c.body, tag.size);
  }
  y += 8 + 16;
  const qrTop = y;
  y += 320 + 8 + 14;
  const headTop = y;
  y += headLine * headline.lines.length;
  const panelH = y + 34 - panel.top;

  // Icon row: icon, 6 gap, label; items 26 apart, centred.
  const labelSize = 12;
  const rowTop = panel.top + panelH + 30;
  const widths = p.items.map((i) => Math.max(22, measure(c.bodyBold, labelSize, i.short)));
  const rowW = widths.reduce((a, b) => a + b, 0) + 26 * Math.max(0, p.items.length - 1);
  // The icon sits on the text baseline in the design, so it keeps a descender's room below it.
  const iconBox = 22 + descent(c.bodyBold, labelSize);
  const lefts = widths.map((_, i) => cx - rowW / 2 + widths.slice(0, i).reduce((a, b) => a + b + 26, 0));

  return (
    <>
      <rect x={-c.bleed} y={-c.bleed} width={c.W + 2 * c.bleed} height={c.H + 2 * c.bleed} fill={t.card} />
      <path d={boxPath(panel.x, panel.top, panel.w, panelH, 220, 220, 32, 32)} fill={t.bg} />
      <Logo c={c} cx={cx} cy={logoCy} radius={30} initials={p.initials} initialsSize={22} logoSrc={p.logoSrc} />
      <Lines c={c} face={c.head} size={name.size} x={cx} top={nameTop} lineHeight={nameLine} fill={t.text} anchor="middle" lines={name.lines} />
      {tag ? (
        <Line c={c} face={c.body} size={tag.size} x={cx} top={tagTop} fill={t.muted} anchor="middle">
          {tag.lines[0]}
        </Line>
      ) : null}
      <Shadow x={cx - 160} y={qrTop} w={320} h={320} radius={22} dy={12} blur={30} spread={-20} alpha={0.4} />
      <rect x={r(cx - 160)} y={r(qrTop)} width={320} height={320} rx={22} fill="#FFFFFF" />
      <Qr art={p.art} x={cx - 146} y={qrTop + 14} size={292} />
      <Lines c={c} face={c.head} size={headline.size} x={cx} top={headTop} lineHeight={headLine} fill={t.text} anchor="middle" lines={headline.lines} />

      {p.items.map((item, i) => {
        const mid = lefts[i] + widths[i] / 2;
        return (
          <g key={`${item.type}-${i}`}>
            <ItemIcon type={item.type} x={mid - 11} y={rowTop} size={22} color={t.iconfg} />
            <Line c={c} face={c.bodyBold} size={labelSize} x={mid} top={rowTop + iconBox + 6} fill={t.text} anchor="middle">
              {item.short}
            </Line>
          </g>
        );
      })}

      <PoweredBy c={c} cx={cx} cy={c.H - 28 - 10} />
    </>
  );
}
