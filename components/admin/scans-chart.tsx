import { niceMax } from "./chart-scale";

// Line chart from docs/design/AdminApp.dc.html: 640 x 230 viewBox, the plot
// runs from x=40 to x=612 and from y=190 (zero) to y=25 (the top gridline). The
// top gridline is picked from the data so the line always fills the plot.
const X0 = 40;
const X1 = 612;
const Y_ZERO = 190;
const Y_TOP = 25;

function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

export function ScansChart({
  series,
  axis,
  days,
}: {
  series: { value: number }[];
  axis: { index: number; text: string }[];
  days: number;
}) {
  const MAX = niceMax(Math.max(0, ...series.map((p) => p.value)));
  const GRID = [0, 1, 2, 3, 4].map((i) => (MAX / 4) * i);
  const step = series.length > 1 ? (X1 - X0) / (series.length - 1) : 0;
  const xs = series.map((_, i) => X0 + i * step);
  const ys = series.map((p) => Y_ZERO - (p.value / MAX) * (Y_ZERO - Y_TOP));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x} ${ys[i]}`).join("");
  const area = series.length > 1 ? `M${X0} ${Y_ZERO}V${ys[0]}${line.slice(line.indexOf("L"))}V${Y_ZERO}Z` : "";
  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;

  return (
    <svg
      viewBox="0 0 640 230"
      role="img"
      aria-label={`Line chart of counted scans per day over the last ${days} days, going from about ${round10(first)} to about ${round10(last)}`}
      className="mt-3 block h-auto w-full"
    >
      {GRID.map((g) => {
        const y = Y_ZERO - (g / MAX) * (Y_ZERO - Y_TOP);
        return (
          <g key={g}>
            <path d={`M${X0} ${y}H620`} className="fill-none stroke-line" strokeWidth={1} />
            <text x={32} y={y + 4} textAnchor="end" className="fill-muted text-[11px]">
              {g}
            </text>
          </g>
        );
      })}
      <path d={area} className="fill-accent" fillOpacity={0.12} />
      <path
        d={line}
        className="fill-none stroke-accent"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {series.length > 0 ? (
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4.5} className="fill-accent" />
      ) : null}
      {axis.map((a) => (
        <text
          key={a.text}
          x={xs[a.index]}
          y={214}
          textAnchor="middle"
          className="fill-muted text-[11px]"
        >
          {a.text}
        </text>
      ))}
    </svg>
  );
}
