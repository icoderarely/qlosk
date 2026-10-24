// The /llms.txt summary for AI assistants and answer engines: what the product is, who it is
// for, what it costs and where to look. Built from the same data as the page so it cannot
// drift. Pure, no Next.js imports.
import type { PricingCard } from "./plans.ts";

type Input = {
  name: string;
  url: string;
  description: string;
  email: string;
  plans: PricingCard[];
  faqs: { q: string; a: string }[];
};

export function llmsTxt({ name, url, description, email, plans, faqs }: Input): string {
  const prices =
    plans.length > 0
      ? plans.map((p) => `- ${p.title}: ${p.price} ${p.per}${p.note ? ` (${p.note})` : ""}`).join("\n")
      : "- Message us on WhatsApp for today's prices.";
  return `# ${name}

> ${name} gives a local shop in India one permanent QR code that opens a fast mobile page with buttons for Call, WhatsApp, Google review, Instagram, Wi-Fi, Maps and the latest offer. ${description}

## Who it is for
Shops that serve customers in person, such as salons, clinics, gyms, cafes, jewellers and boutiques. Customers need no app: they scan with the phone camera and the page opens in the browser.

## How it works
- The shop owner messages us on WhatsApp with the shop name, logo, phone number and links.
- We build the page, share a preview and, after approval, take payment.
- The QR code is printed once and never changes; we update the page whenever the shop asks.
- A monthly report on WhatsApp shows scans and taps.

## Pricing (INR, from the live price list)
${prices}
Every plan includes setup, the page, changes on WhatsApp and a monthly report. Longer plans include a printed standee.

## Pages
- [Home](${url}/): what ${name} is, how it works, pricing and questions
- [Playground](${url}/playground): free tool to try every theme, layout and font on a sample shop page
- [Privacy](${url}/privacy), [Terms](${url}/terms), [Refunds](${url}/refunds)

## Frequently asked questions
${faqs.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

## Contact
${email}, or the WhatsApp button on ${url}/
`;
}
