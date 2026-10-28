import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { title: "Qlosk", url: "/", siteName: "Qlosk", locale: "en_IN", type: "website" },
};

const DEVELOPER_EMAIL = "dev@qlosk.com";

// The studio's front door: one screen, no scrolling (see .q-home in site.css).
export default function Home() {
  return (
    <div className="q-home">
      <main>
        <div>
          <div className="q-home-brand">
            <BrandMark title="Qlosk" />
            <span>qlosk</span>
          </div>
        </div>
        <div>
          <h1>
            Small, useful software, <em>made with care.</em>
          </h1>
          <p className="q-home-lede">Qlosk is an independent studio from India. Two products so far, both built to be simple to use.</p>
        </div>
        <nav aria-label="Products" className="q-home-cards">
          <Link href="/qr" className="q-card">
            <span className="q-card-icon">
              <BrandMark />
            </span>
            <span>
              <span className="q-card-name">Qlosk QR</span>
              <span className="q-card-desc">One QR code for your whole shop</span>
            </span>
            <span className="q-card-arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/mathlo" className="q-card">
            <span className="q-card-icon">
              {/* eslint-disable-next-line @next/next/no-img-element -- a 56px SVG; nothing to optimise */}
              <img src="/mathlo/mathlo-icon-rounded.svg" alt="" width={56} height={56} />
            </span>
            <span>
              <span className="q-card-name">Mathlo</span>
              <span className="q-card-desc">Daily brain games for your phone</span>
            </span>
            <span className="q-card-arrow" aria-hidden="true">→</span>
          </Link>
        </nav>
      </main>
      <footer>
        <span>© Qlosk</span>
        <a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a>
      </footer>
    </div>
  );
}
