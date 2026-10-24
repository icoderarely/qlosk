import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { WhatsAppLogo } from "@/components/landing/parts";
import { BRAND_NAME, LEGAL_UPDATED, SUPPORT_EMAIL } from "@/lib/brand";
import type { LegalBlock, LegalDoc } from "./types";
import { LEGAL_DOCS } from "./docs";

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  return (
    <ul>
      {block.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Header, numbered sections and contact card shared by Terms, Privacy and Refunds. */
export function LegalPage({ doc, whatsappHref }: { doc: LegalDoc; whatsappHref: string }) {
  const hasEmail = SUPPORT_EMAIL.includes("@");
  return (
    <>
      <header className="lg-head">
        <div className="lg-wrap lg-headrow">
          <Link href="/" className="l-brand" aria-label={`${BRAND_NAME}, home`}>
            <span className="l-mark"><BrandMark className="size-full" /></span>
            <span className="l-serif l-brandname">{BRAND_NAME}</span>
          </Link>
          <Link href="/" className="lg-back">Back to home</Link>
        </div>
      </header>
      <main className="lg-main">
        <div className="lg-wrap">
          <nav className="lg-tabs" aria-label="Legal pages">
            {LEGAL_DOCS.map((d) => (
              <Link key={d.slug} href={`/${d.slug}`} aria-current={d.slug === doc.slug ? "page" : undefined}>
                {d.short}
              </Link>
            ))}
          </nav>
          <article className="lg-doc">
            <h1 className="l-serif">{doc.title}</h1>
            <p className="lg-updated">Last updated {LEGAL_UPDATED}</p>
            <p className="lg-intro">{doc.intro}</p>
            {doc.sections.map((s, i) => (
              <section key={s.title} className="lg-sec" aria-labelledby={`s${i + 1}`}>
                <span className="lg-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h2 id={`s${i + 1}`}>{s.title}</h2>
                {s.blocks.map((b, j) => (
                  <Block key={j} block={b} />
                ))}
              </section>
            ))}
            <aside className="lg-contact" aria-labelledby="lg-contact-h">
              <h2 id="lg-contact-h" className="l-serif">Questions about this page?</h2>
              <p>Message us with your shop name. Most things are sorted the same day.</p>
              <div className="lg-contact-row">
                <a className="l-btn l-btn-p" href={whatsappHref}><WhatsAppLogo />Chat on WhatsApp</a>
                {hasEmail ? <a className="l-btn l-btn-s" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : null}
              </div>
            </aside>
          </article>
        </div>
      </main>
    </>
  );
}
