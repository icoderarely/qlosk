import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./mathlo.css";

// qlosk.com/mathlo: the landing page for the Mathlo app. Copy comes from the Play Store listing
// (mathlo repo, docs/store/play_listing.md). Static: nothing here is read at request time.
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", weight: ["500", "600", "700"], display: "swap", adjustFontFallback: true });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["500", "600", "700"], display: "swap", adjustFontFallback: true });

const TITLE = "Mathlo: Daily Brain Games";
const DESCRIPTION = "Quick mental maths and logic puzzles. A daily challenge and a streak to keep. Six games, no ads.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/mathlo" },
  icons: {
    icon: [
      { url: "/mathlo/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/mathlo/mathlo-icon-rounded.svg", type: "image/svg+xml" },
    ],
    apple: "/mathlo/apple-touch-icon.png",
  },
  manifest: "/mathlo/manifest.webmanifest",
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/mathlo", siteName: "Qlosk", locale: "en_IN", type: "website", images: [{ url: "/mathlo/img/og.png", width: 1024, height: 500, alt: "Mathlo: your daily brain gym" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/mathlo/img/og.png"] },
};

// One place to switch the store buttons on. Set a URL and the button becomes a real link.
const PLAY_STORE_URL: string | null = null;
const APP_STORE_URL: string | null = null;

const GAMES = [
  { id: "speed", name: "Speed Math", text: "Answer as many sums as you can against the clock.", from: "#8B5CF6", to: "#4C1D95" },
  { id: "chain", name: "Chain Math", text: "Keep a running total through a chain of operations.", from: "#06B6D4", to: "#0E5F73" },
  { id: "target", name: "Target 24", text: "Combine four numbers to make 24.", from: "#F43F9D", to: "#9D174D" },
  { id: "sudoku", name: "Mini Sudoku", text: "4×4 and 6×6 grids, solved in minutes.", from: "#10D9A0", to: "#0B6E55" },
  { id: "pipe", name: "Pipe Flow", text: "Rotate the pipes so the water reaches the drain.", from: "#3B82F6", to: "#1E3A8A" },
  { id: "slide", name: "Number Grid Slide", text: "Slide the tiles back into order.", from: "#F59E0B", to: "#92400E" },
] as const;

const SHOTS = [
  { file: "01-home", alt: "Mathlo home: a 12-day streak, level 4 and today's Daily Challenge with three rounds done" },
  { file: "02-games", alt: "The Games tab with Speed Math, Chain Math, Target 24 and Mini Sudoku" },
  { file: "03-speed-math", alt: "Speed Math mid-round with a timer ring, combo counter and number keypad" },
  { file: "04-target-24", alt: "Target 24: four number tiles and operators to make 24" },
  { file: "05-pipe-flow", alt: "Pipe Flow: a five by five grid of pipes with water flowing" },
  { file: "06-streak", alt: "The streak screen: a 12 day streak, a streak freeze and the month calendar" },
  { file: "07-mastery", alt: "The times-table mastery map from Unseen to Mastered" },
  { file: "08-level-map", alt: "A Mini Sudoku level map with a winding path and stars to earn" },
  { file: "09-wardrobe", alt: "The wardrobe: hats and outfits for the Mathlo mascot" },
  { file: "10-grid-slide", alt: "Number Grid Slide: an orange three by three board with a par move count" },
];

const FAQ = [
  { q: "Is Mathlo free?", a: "Yes. There are no ads and nothing to buy. The mascot's outfits are earned by playing." },
  { q: "Do I need an account?", a: "No. Play as a guest and everything stays on your phone. Sign in with Google only if you want your progress saved and available on a new phone." },
  { q: "Does it work offline?", a: "Yes. The games run on your phone, so you can play without a connection." },
  { q: "Is there an iPhone version?", a: "It is planned. Android comes first, and we will add the App Store button here when iPhone is ready." },
  { q: "Will it help me pass an exam?", a: "Mathlo is a game for practice and fun. It does not promise exam results, but regular practice is how mental maths gets faster and sharper." },
];

const art = (id: string) => readFileSync(path.join(process.cwd(), "components/mathlo/art", `${id}.svg`), "utf8");

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M4 2.6v18.8c0 .5.5.8.9.6L20.6 12 4.9 2c-.4-.2-.9.1-.9.6z" fill="#fff" />
    </svg>
  );
}
function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        d="M16.4 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.8-.8c-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2.1.8-1.2 1.2-2.3 1.2-2.4 0 0-2.3-.9-2.3-3.1zM14.3 6.2c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z"
        fill="#fff"
      />
    </svg>
  );
}

// Not links until the apps are in the stores: no href, not focusable, clearly dimmed.
function StoreButton({ kind, href }: { kind: "play" | "apple"; href: string | null }) {
  const name = kind === "play" ? "Google Play" : "App Store";
  const small = kind === "play" ? "Get it on" : "Download on the";
  const inner = (
    <>
      {kind === "play" ? <PlayGlyph /> : <AppleGlyph />}
      <span className="m-store-text">
        <span>{small}</span>
        <strong>{name}</strong>
      </span>
    </>
  );
  if (href) {
    return (
      <a className="m-store" href={href}>
        {inner}
      </a>
    );
  }
  return (
    <div className="m-store m-store-off" aria-disabled="true">
      {inner}
      <span className="m-soon">Coming soon</span>
    </div>
  );
}

export default function MathloPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "Mathlo: Daily Brain Games",
    description: DESCRIPTION,
    applicationCategory: "GameApplication",
    operatingSystem: "Android",
    url: "https://qlosk.com/mathlo",
    publisher: { "@type": "Organization", name: "Qlosk", url: "https://qlosk.com" },
  };

  return (
    <div className={`m-page ${fredoka.variable} ${jakarta.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="m-orbs" aria-hidden="true" />

      <header className="m-nav">
        <a href="/mathlo" className="m-logo" aria-label="Mathlo home">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small SVG */}
          <img src="/mathlo/mathlo-icon-rounded.svg" alt="" width={40} height={40} />
          <span>mathlo</span>
        </a>
        <nav aria-label="Page sections" className="m-nav-links">
          <a href="#games">Games</a>
          <a href="#watch">Watch</a>
          <a href="#daily">Daily habit</a>
          <a href="#better">Get better</a>
          <a href="#screens">Screens</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="m-nav-soon" aria-disabled="true">Coming soon</div>
      </header>

      <main>
        <section className="m-hero m-wrap" aria-labelledby="hero-title">
          <div className="m-hero-copy">
            <p className="m-pill">Daily brain games</p>
            <h1 id="hero-title">
              Train your brain <span>a little more every day.</span>
            </h1>
            <p className="m-lede">
              Mathlo is a daily brain gym with quick mental-maths and logic puzzles. Play today&apos;s Daily Challenge, keep your streak going,
              and watch your speed and accuracy grow week by week.
            </p>
            <div className="m-stores">
              <StoreButton kind="play" href={PLAY_STORE_URL} />
              <StoreButton kind="apple" href={APP_STORE_URL} />
            </div>
            <ul className="m-chips" aria-label="Highlights">
              <li>6 games</li>
              <li>Daily challenge</li>
              <li>No ads</li>
            </ul>
          </div>
          <div className="m-hero-art">
            {/* eslint-disable @next/next/no-img-element -- pre-sized static WebP */}
            <img className="m-hero-shot" src="/mathlo/img/01-home.webp" alt={SHOTS[0].alt} width={720} height={1280} fetchPriority="high" />
            <img className="m-hero-mascot" src="/mathlo/img/mascot.svg" alt="" width={150} height={151} />
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </section>

        <section id="games" className="m-section m-wrap" aria-labelledby="games-title">
          <p className="m-over">Six games, one habit</p>
          <h2 id="games-title">Pick your puzzle.</h2>
          <ul className="m-games">
            {GAMES.map((g) => (
              <li key={g.id} className="m-game" style={{ "--from": g.from, "--to": g.to } as React.CSSProperties}>
                <div className="m-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(g.id) }} />
                <h3>{g.name}</h3>
                <p>{g.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="watch" className="m-section m-wrap" aria-labelledby="watch-title">
          <p className="m-over">See it in action</p>
          <h2 id="watch-title">Watch Mathlo play.</h2>
          <figure className="m-video">
            {/* The film has music and no narration: it starts only when the visitor presses play. */}
            <video controls playsInline preload="none" poster="/mathlo/video/brag-poster.webp" aria-label="A 34 second tour of Mathlo: the daily challenge, six games, streaks, mastery and outfits">
              <source src="/mathlo/video/brag.mp4" type="video/mp4" />
              Your browser can&apos;t play this video. <a href="/mathlo/video/brag.mp4">Download it instead</a>.
            </video>
            <figcaption>
              Music: &quot;Happy Beats / Business Moves&quot; by Sascha Ende,{" "}
              <a href="https://ende.app/en/standard-license" target="_blank" rel="noopener noreferrer">
                ende.app
              </a>{" "}
              (CC BY 4.0).
            </figcaption>
          </figure>
        </section>

        <section id="daily" className="m-section m-wrap m-split" aria-labelledby="daily-title">
          <div>
            <p className="m-over">A daily challenge</p>
            <h2 id="daily-title">A fresh set of rounds every day.</h2>
            <p className="m-body">Finish it to grow your streak. Miss a day? A streak freeze has your back, and you can win a broken streak back with a rescue.</p>
            <ul className="m-list">
              <li>Three rounds a day, then a chest to open</li>
              <li>Streak freezes, earned every week</li>
              <li>Daily quests and XP that level you up</li>
              <li>Challenge a friend to the exact same puzzle with a code</li>
            </ul>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized static WebP */}
          <img className="m-shot" src="/mathlo/img/06-streak.webp" alt={SHOTS[5].alt} width={720} height={1280} loading="lazy" />
        </section>

        <section id="better" className="m-section m-wrap m-split m-flip" aria-labelledby="better-title">
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized static WebP */}
          <img className="m-shot" src="/mathlo/img/07-mastery.webp" alt={SHOTS[6].alt} width={720} height={1280} loading="lazy" />
          <div>
            <p className="m-over">Get better, not just busier</p>
            <h2 id="better-title">See what you&apos;ve mastered.</h2>
            <p className="m-body">A times-table map shows which facts are solid and which need work, so your practice goes where it counts.</p>
            <ul className="m-list">
              <li>Times-table mastery map, from Unseen to Mastered</li>
              <li>Trainer drills for squares, cubes, percentages, complements and quick estimation</li>
              <li>Level maps with stars for every game</li>
              <li>A weekly recap of your progress, and a Weekly Boss to beat</li>
              <li>Brain workouts that fit the time you have</li>
            </ul>
          </div>
        </section>

        <section id="screens" className="m-section" aria-labelledby="screens-title">
          <div className="m-wrap">
            <p className="m-over">Take a look</p>
            <h2 id="screens-title">Inside Mathlo.</h2>
          </div>
          <div className="m-gallery" role="region" aria-label="Screenshots, scroll sideways" tabIndex={0}>
            {/* eslint-disable @next/next/no-img-element -- pre-sized static WebP */}
            {SHOTS.map((s) => (
              <img key={s.file} src={`/mathlo/img/${s.file}.webp`} alt={s.alt} width={720} height={1280} loading="lazy" />
            ))}
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </section>

        <section id="wardrobe" className="m-section m-wrap m-split" aria-labelledby="wardrobe-title">
          <div>
            <p className="m-over">Play your way</p>
            <h2 id="wardrobe-title">Dress up your mascot.</h2>
            <p className="m-body">Earn hats, glasses, scarves and themes just by playing. Nothing to buy.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized static WebP */}
          <img className="m-shot" src="/mathlo/img/09-wardrobe.webp" alt={SHOTS[8].alt} width={720} height={1280} loading="lazy" />
        </section>

        <section className="m-section m-wrap" aria-labelledby="trust-title">
          <h2 id="trust-title" className="m-center">Made to be calm and honest.</h2>
          <ul className="m-trust">
            <li>
              <strong>No ads</strong>
              <span>Nothing gets between you and the next puzzle.</span>
            </li>
            <li>
              <strong>Guest-friendly</strong>
              <span>Play as a guest and everything stays on your phone.</span>
            </li>
            <li>
              <strong>Optional sign-in</strong>
              <span>Use Google only if you want your progress saved on a new phone.</span>
            </li>
          </ul>
        </section>

        <section id="faq" className="m-section m-wrap m-narrow" aria-labelledby="faq-title">
          <h2 id="faq-title" className="m-center">Questions</h2>
          <div className="m-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="m-section m-wrap m-cta" aria-labelledby="cta-title">
          <h2 id="cta-title">Ready for today&apos;s round?</h2>
          <p className="m-body">Mathlo is coming to Google Play soon, with iPhone to follow.</p>
          <div className="m-stores m-stores-center">
            <StoreButton kind="play" href={PLAY_STORE_URL} />
            <StoreButton kind="apple" href={APP_STORE_URL} />
          </div>
        </section>
      </main>

      <footer className="m-foot">
        <div className="m-wrap m-foot-in">
          <p>
            Mathlo is a game for practice and fun. It doesn&apos;t promise exam results. Made by <Link href="/">Qlosk</Link>.
          </p>
          <nav aria-label="Legal and support">
            <a href="/mathlo/privacy">Privacy</a>
            <a href="/mathlo/terms">Terms</a>
            <a href="/mathlo/support">Support</a>
            <a href="/mathlo/delete-account">Delete account</a>
            <a href="mailto:mathlo@qlosk.com">mathlo@qlosk.com</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
