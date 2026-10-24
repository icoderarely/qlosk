import type { CSSProperties } from "react";
import { QrArt } from "./parts";

// Start positions around the centre card, in cqw (1% of the stage width), plus a tilt.
// They merge into the one code on a loop; without motion they stay as a still diagram.
const CODES = [
  { label: "Review us", n: 1, x: -36, y: -33, r: -8, v: 0 },
  { label: "Instagram", n: 2, x: 36, y: -35, r: 6, v: 1 },
  { label: "WhatsApp", n: 3, x: -39, y: 0, r: 4, v: 2 },
  { label: "Wi-Fi", n: 4, x: 39, y: 2, r: -5, v: 3 },
  { label: "Menu", n: 5, x: -35, y: 34, r: 7, v: 1 },
  { label: "Maps", n: 6, x: 35, y: 34, r: -6, v: 2 },
] as const;

// Little squares that twinkle behind the stage, in % of its width.
const PIXELS = [[6, 14], [92, 10], [14, 88], [88, 84], [50, 3], [3, 52], [97, 48], [62, 96], [30, 6], [76, 94]] as const;

export function Problem() {
  return (
    <section className="l-sec l-dark l-problem" aria-labelledby="problem-title">
      <div className="l-wrap l-two">
        <div className="l-col">
          <span className="l-kick l-butter">The problem</span>
          <h2 id="problem-title" className="l-serif l-h2">Your counter has too many codes.</h2>
          <p className="l-lead" style={{ color: "var(--on-dark-mut)" }}>
            A review card here, an Instagram sticker there, a Wi-Fi slip, a menu. Most customers scan one, if any. Put
            everything behind one code and change it any time, without reprinting.
          </p>
        </div>
        <div className="l-solve">
          <div className="l-merge">
            <div className="l-bgfx" aria-hidden="true">
              <i className="l-orbit l-orbit-1" />
              <i className="l-orbit l-orbit-2" />
              <i className="l-ripple" />
              {PIXELS.map(([x, y], i) => (
                <i key={i} className="l-px" style={{ left: `${x}%`, top: `${y}%`, "--d": i } as CSSProperties} />
              ))}
            </div>
            <div className="l-mcodes" aria-hidden="true">
              {CODES.map(({ label, n, x, y, r, v }, i) => (
                <div
                  key={label}
                  className="l-mtile"
                  style={
                    {
                      "--x": `${x}cqw`,
                      "--y": `${y}cqw`,
                      "--r": `${r}deg`,
                      "--i": i,
                      background: `var(--st${n}-bg)`,
                      color: `var(--st${n}-fg)`,
                    } as CSSProperties
                  }
                >
                  <QrArt size={60} label="" variant={v} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="l-onecode">
              <div className="l-onecode-qr"><QrArt size={150} label="One QR code" /></div>
              <div className="l-serif l-onecode-t">Scan once</div>
              <div className="l-muted l-onecode-s">Everything is here</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
