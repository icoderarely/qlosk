import type { Metadata } from "next";
import { BRAND_NAME, SITE_DESCRIPTION } from "@/lib/brand";
import { loadLandingData } from "@/lib/landing-data";
import { ClosingCta } from "@/components/landing/closing-cta";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { LANDING_FONTS } from "@/components/landing/fonts";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Looks } from "@/components/landing/looks";
import { MadeFor } from "@/components/landing/made-for";
import { Navbar } from "@/components/landing/navbar";
import { waFrom } from "@/components/landing/parts";
import { cheapestMonth } from "@/services/plans";
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
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: SITE_DESCRIPTION, url: "/" },
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
