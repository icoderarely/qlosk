import { BrandMark } from "@/components/brand-mark";
import { WhatsAppLogo } from "./parts";
import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/brand";

// Privacy, Terms and Refunds have no pages yet, so they point to the top (spec: placeholders before launch).
export function Footer({ whatsappHref }: { whatsappHref: string }) {
  return (
    <footer className="l-foot">
      <div className="l-wrap">
        <div className="l-foot-top">
          <div className="l-foot-about">
            <div className="l-brand">
              <span className="l-mark"><BrandMark className="size-5" /></span>
              <span className="l-serif l-brandname">{BRAND_NAME}</span>
            </div>
            <p>One QR for your whole shop. Built for local shops in India.</p>
            <a className="l-btn l-btn-b" href={whatsappHref}><WhatsAppLogo />Chat on WhatsApp</a>
          </div>
          <div className="l-footcols">
            <nav className="l-footcol" aria-label="Product">
              <b>Product</b>
              <a href="#how">How it works</a>
              <a href="#try">Try a look</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </nav>
            <nav className="l-footcol" aria-label="Help">
              <b>Help</b>
              <a href="#faq">FAQ</a>
              <a href={whatsappHref}>WhatsApp us</a>
              <a href={SUPPORT_EMAIL.includes("@") ? `mailto:${SUPPORT_EMAIL}` : "#top"}>{SUPPORT_EMAIL}</a>
            </nav>
            <nav className="l-footcol" aria-label="Legal">
              <b>Legal</b>
              <a href="#top">Privacy</a>
              <a href="#top">Terms</a>
              <a href="#top">Refunds</a>
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
