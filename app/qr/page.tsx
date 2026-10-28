import type { Metadata } from "next";
import { BRAND_NAME, QR_URL, SITE_DESCRIPTION, SUPPORT_EMAIL } from "@/lib/brand";
import { loadLandingData } from "@/lib/landing-data";
import { ClosingCta } from "@/components/landing/closing-cta";
import { Faq } from "@/components/landing/faq";
import { FAQS } from "@/components/landing/faq-data";
import { Features } from "@/components/landing/features";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Looks } from "@/components/landing/looks";
import { MadeFor } from "@/components/landing/made-for";
import { Navbar } from "@/components/landing/navbar";
import { waFrom } from "@/components/landing/parts";
import { JsonLd } from "@/components/seo/json-ld";
import { cheapestMonth } from "@/services/plans";
import { landingJsonLd } from "@/services/structured-data";
import { Pricing } from "@/components/landing/pricing";
import { Problem } from "@/components/landing/problem";
import { Report } from "@/components/landing/report";
import { Trust } from "@/components/landing/trust";
import { TryIt } from "@/components/landing/try-it";
import "@/components/landing/landing.css";

const TITLE = `${BRAND_NAME}: one QR code for your whole shop`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/qr" },
  openGraph: { title: TITLE, description: SITE_DESCRIPTION, url: "/qr", siteName: BRAND_NAME, locale: "en_IN", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: SITE_DESCRIPTION },
};

// Server-rendered and cached for a minute: prices and settings come from the
// database, everything else is static. Client code is only the navbar menu, the
// playground and the FAQ accordion.
export default async function Home() {
  const data = await loadLandingData();
  const wa = (source: Parameters<typeof waFrom>[1]) => waFrom(data.whatsappNumber, source);
  const cheapest = cheapestMonth(data.plans);

  return (
    <div className={`l-root ${LANDING_FONTS}`}>
      <JsonLd
        data={landingJsonLd(
          { name: BRAND_NAME, url: QR_URL, description: SITE_DESCRIPTION, email: SUPPORT_EMAIL, whatsappNumber: data.whatsappNumber },
          data.plans,
          FAQS,
        )}
      />
      <Navbar whatsappHref={wa("navbar")} menuWhatsappHref={wa("menu")} />
      <main>
        <Hero whatsappHref={wa("hero")} fromPrice={cheapest?.perMonth ?? null} />
        <MadeFor />
        <Problem />
        <Looks suggestions={data.suggestions} />
        <HowItWorks />
        <TryIt data={data} />
        <Features />
        <Report />
        <Pricing plans={data.plans} whatsappNumber={data.whatsappNumber} />
        <Trust />
        <Faq />
        <ClosingCta whatsappHref={wa("closing")} />
      </main>
      <Footer whatsappHref={wa("footer")} />
    </div>
  );
}
