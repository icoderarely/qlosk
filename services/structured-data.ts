// schema.org JSON-LD for the marketing pages (SEO and answer engines). Pure: callers pass in
// the site URL, the plans and the FAQ, so prices and answers can never drift from the page.
// Only things visible on the page go in here: no ratings, reviews or counts. No Next.js imports.
import type { PricingCard } from "./plans.ts";

type Site = { name: string; url: string; description: string; email: string; whatsappNumber: string };
type Faq = { q: string; a: string };

/** "9876543210" or "919876543210" as "+919876543210"; null for anything else. */
export function indianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

function organization(site: Site) {
  const phone = indianPhone(site.whatsappNumber);
  return {
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    logo: `${site.url}/icon.svg`,
    email: site.email,
    areaServed: { "@type": "Country", name: "India" },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: site.email,
        ...(phone ? { telephone: phone } : {}),
        availableLanguage: ["English"],
      },
    ],
  };
}

function offers(plans: PricingCard[]) {
  return plans.map((p) => ({
    "@type": "Offer",
    name: p.title,
    price: (p.pricePaise / 100).toFixed(2),
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
  }));
}

/** The landing page: organisation, site, the service with one Offer per plan, and the FAQ. */
export function landingJsonLd(site: Site, plans: PricingCard[], faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization(site),
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: site.description,
        inLanguage: "en-IN",
        publisher: { "@id": `${site.url}/#organization` },
      },
      {
        "@type": "Service",
        "@id": `${site.url}/#service`,
        name: `${site.name} shop QR page`,
        serviceType: "QR code page for local shops",
        description: site.description,
        provider: { "@id": `${site.url}/#organization` },
        areaServed: { "@type": "Country", name: "India" },
        ...(plans.length > 0 ? { offers: offers(plans) } : {}),
      },
      {
        "@type": "FAQPage",
        "@id": `${site.url}/#faq`,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

/** The playground: a free web tool, plus a breadcrumb back to the home page. */
export function playgroundJsonLd(site: Site, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${site.url}/playground#app`,
        name,
        url: `${site.url}/playground`,
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser",
        isAccessibleForFree: true,
        inLanguage: "en-IN",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        publisher: { "@id": `${site.url}/#organization` },
      },
      organization(site),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: site.url },
          { "@type": "ListItem", position: 2, name, item: `${site.url}/playground` },
        ],
      },
    ],
  };
}
