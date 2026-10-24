import { BRAND_NAME } from "@/lib/brand";
import { SAMPLES } from "@/components/playground/samples";
import { ShopPage } from "@/components/shop-page/shop-page";
import { Ic, QrArt } from "./parts";

// The hero phone is the real ShopPage (graphite, list, editorial), not a picture.
// It is decorative here, so it is inert: no tab stops and no taps.
export function Hero({ whatsappHref, fromPrice }: { whatsappHref: string; fromPrice: string | null }) {
  const sample = SAMPLES.salon;
  return (
    <section id="top" aria-labelledby="hero-title" style={{ padding: "12px 12px 0" }}>
      <div className="l-herobox">
        <div className="l-wrap">
          <div className="l-hero">
            <div className="l-hero-copy">
              <span className="l-badge"><i />Done for you · set up on WhatsApp</span>
              <h1 id="hero-title" className="l-serif l-h1">
                One QR for your <em className="l-em">whole shop.</em>
              </h1>
              <p className="l-lead" style={{ maxWidth: 520, color: "var(--on-hero)" }}>
                Customers scan once and get Call, WhatsApp, Google review, Wi-Fi, Maps and your latest offer. We build
                the page, print the standee and send you a report every month.
              </p>
              <div className="l-ctas">
                <a className="l-btn l-btn-b" href="#try">Try a look for my shop <Ic d="arrowRight" /></a>
                <a className="l-btn l-btn-g" href={whatsappHref}>Chat on WhatsApp</a>
              </div>
              <ul className="l-checks">
                <li><Ic d="check" className="l-tick-b" />No app to install</li>
                <li><Ic d="check" className="l-tick-b" />Setup included</li>
                {fromPrice ? <li><Ic d="check" className="l-tick-b" />From {fromPrice} a month</li> : null}
              </ul>
            </div>

            <div className="l-hero-art" aria-hidden="true">
              <div className="l-art">
                <div className="l-ring1" />
                <div className="l-ring2" />
                <div className="l-hphone">
                  <div className="l-hscreen" inert>
                    <div className="l-hinner">
                      <ShopPage
                        theme="graphite"
                        layout="list"
                        font="editorial"
                        shop={sample.shop}
                        links={sample.links}
                        offer={sample.offer}
                        wifi={sample.wifi}
                        banner={sample.banner}
                        nameTag="div"
                      />
                    </div>
                  </div>
                </div>
                <div className="l-float l-float-qr">
                  <QrArt size={130} label={`Sample QR code for ${BRAND_NAME}`} />
                  <div style={{ textAlign: "center", fontWeight: 800, marginTop: 6 }}>Scan me</div>
                </div>
                <div className="l-float l-float-wa">
                  <span className="l-tic l-tic-sm"><Ic d="whatsapp" /></span>
                  <span className="l-float-t">WhatsApp opened<br /><span>from your counter</span></span>
                </div>
                <div className="l-float l-float-rv">
                  <span className="l-tic l-tic-sm"><Ic d="star" /></span>
                  <span className="l-float-t">Google review<br /><span>one tap away</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
