import { Ic } from "./parts";

export function ClosingCta({ whatsappHref }: { whatsappHref: string }) {
  return (
    <section style={{ padding: "88px 0" }} aria-labelledby="cta-title">
      <div className="l-wrap">
        <div className="l-cta">
          <div className="l-cta-ring" aria-hidden="true" />
          <div className="l-cta-copy">
            <h2 id="cta-title" className="l-serif l-h2">Put one standee on your counter.</h2>
            <p>Message us on WhatsApp. You see a preview of your page before you pay anything.</p>
          </div>
          <a className="l-btn l-btn-b" href={whatsappHref}>Message us on WhatsApp <Ic d="arrowRight" /></a>
        </div>
      </div>
    </section>
  );
}
