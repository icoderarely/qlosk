import type { CSSProperties } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { InView } from "./in-view";
import { Ic } from "./parts";

const TICKS = ["Scans and button taps", "Your top button and best day", "Sent on the 1st, nothing to log in to"];
// Heights of the four sample bars. The card says "Sample data" in three places.
const BARS = [
  { week: "Week 1", x: 30, y: 70, h: 50 },
  { week: "Week 2", x: 110, y: 48, h: 72 },
  { week: "Week 3", x: 190, y: 30, h: 90 },
  { week: "Week 4", x: 270, y: 56, h: 64 },
];

export function Report() {
  return (
    <section className="l-sec l-mintbg" aria-labelledby="report-title">
      <div className="l-wrap l-two">
        <div className="l-col" style={{ gap: 20 }}>
          <span className="l-kick">Monthly report</span>
          <h2 id="report-title" className="l-serif l-h2">A report on WhatsApp, every month.</h2>
          <p className="l-lead">
            How many people scanned, what they tapped and your busiest day. Bots and link previews are filtered out, so
            the numbers are real people.
          </p>
          <ul className="l-ticks">
            {TICKS.map((t) => (
              <li key={t}><Ic d="check" className="l-tick-a" />{t}</li>
            ))}
          </ul>
        </div>
        <InView className="l-report-view">
          <figure className="l-wa" style={{ margin: 0 }}>
            <figcaption className="l-wa-head">
              <span className="l-wa-dot"><Ic d="whatsapp" /></span>
              <span>
                <b style={{ display: "block", fontWeight: 800 }}>{BRAND_NAME}</b>
                <span className="l-wa-sub">Monthly report · sample</span>
              </span>
            </figcaption>
            <div className="l-wa-bubble">
              <div style={{ fontWeight: 800 }}>Your October report</div>
              <div className="l-muted" style={{ fontSize: 13, marginBottom: 12 }}>Sample data, for illustration</div>
              <svg className="l-chart" viewBox="0 0 360 150" role="img" aria-label="Sample bar chart of scans for each week of the month. Sample data.">
                <path className="l-chart-axis" d="M10 120H350" />
                {BARS.map((b, i) => (
                  <rect key={b.week} className="l-chart-bar" style={{ "--i": i } as CSSProperties} x={b.x} y={b.y} width="50" height={b.h} rx="8" />
                ))}
                {BARS.map((b) => (
                  <text key={b.week} className="l-chart-txt" x={b.x + 25} y="140">{b.week}</text>
                ))}
              </svg>
              <div className="l-wa-pills">
                <span className="l-pill">Top button: WhatsApp</span>
                <span className="l-pill">Best day: Saturday</span>
              </div>
            </div>
          </figure>
        </InView>
      </div>
    </section>
  );
}
