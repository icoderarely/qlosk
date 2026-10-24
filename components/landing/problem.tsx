import { QrArt } from "./parts";

const STICKERS = [
  { label: "Review us", n: 1, style: { left: 0, top: 10, rotate: "-8deg" } },
  { label: "Instagram", n: 2, style: { right: 0, top: 0, rotate: "6deg" } },
  { label: "WhatsApp", n: 3, style: { left: 30, top: 86, rotate: "4deg" } },
  { label: "Wi-Fi", n: 4, style: { right: 6, top: 100, rotate: "-5deg" } },
  { label: "Menu", n: 5, style: { left: 6, top: 168, rotate: "7deg" } },
  { label: "Maps", n: 6, style: { right: 20, top: 176, rotate: "-6deg" } },
] as const;

export function Problem() {
  return (
    <section className="l-sec l-dark" aria-labelledby="problem-title">
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
          <div className="l-stickers" aria-hidden="true">
            {STICKERS.map(({ label, n, style: { rotate, ...place } }) => (
              <span
                key={label}
                className="l-sticker"
                style={{ ...place, background: `var(--st${n}-bg)`, color: `var(--st${n}-fg)`, transform: `rotate(${rotate})` }}
              >
                {label}
              </span>
            ))}
          </div>
          <svg className="l-ic l-solve-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
          <div className="l-onecode">
            <div style={{ margin: "0 auto", width: 150 }}><QrArt size={150} label="One QR code" /></div>
            <div className="l-serif" style={{ fontSize: 20, marginTop: 8 }}>Scan once</div>
            <div className="l-muted" style={{ fontSize: 13 }}>Everything is here</div>
          </div>
        </div>
      </div>
    </section>
  );
}
