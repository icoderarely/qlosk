import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { WhatsAppLogo } from "./parts";
import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/brand";

// Anchors start with "/" so the footer also works on the legal pages.
export function Footer({ whatsappHref }: { whatsappHref: string }) {
  return (
    <footer className="l-foot">
      <div className="l-wrap">
        <div className="l-foot-top">
          <div className="l-foot-about">
            <div className="l-brand">
              <span className="l-mark"><BrandMark className="size-full" /></span>
              <span className="l-serif l-brandname">{BRAND_NAME}</span>
            </div>
            <p>One QR for your whole shop. Built for local shops in India.</p>
            <a className="l-btn l-btn-b" href={whatsappHref}><WhatsAppLogo />Chat on WhatsApp</a>
          </div>
          <div className="l-footcols">
            <nav className="l-footcol" aria-label="Product">
              <b>Product</b>
              <Link href="/#how">How it works</Link>
              <Link href="/#try">Try a look</Link>
              <Link href="/#features">Features</Link>
              <Link href="/#pricing">Pricing</Link>
            </nav>
            <nav className="l-footcol" aria-label="Help">
              <b>Help</b>
              <Link href="/#faq">FAQ</Link>
              <a href={whatsappHref}>WhatsApp us</a>
              <a href={SUPPORT_EMAIL.includes("@") ? `mailto:${SUPPORT_EMAIL}` : "#top"}>{SUPPORT_EMAIL}</a>
            </nav>
            <nav className="l-footcol" aria-label="Legal">
              <b>Legal</b>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/refunds">Refunds</Link>
            </nav>
          </div>
        </div>
        <div className="l-foot-base">
          <span>© {BRAND_NAME}. All rights reserved.</span>
          <span>Made with <span aria-hidden="true">♥</span><span className="l-sr">love</span> in India</span>
        </div>
      </div>
    </footer>
  );
}
