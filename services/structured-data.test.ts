import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PricingCard } from "./plans.ts";
import { indianPhone, landingJsonLd, playgroundJsonLd } from "./structured-data.ts";

const SITE = {
  name: "Qlosk",
  url: "https://qlosk.com",
  description: "One QR for your shop.",
  email: "support@qlosk.com",
  whatsappNumber: "",
};
const card = (months: number, pricePaise: number): PricingCard => ({
  months,
  title: `${months} month`,
  price: "x",
  pricePaise,
  per: "/ month",
  perMonth: "x",
  perMonthPaise: pricePaise,
  was: null,
  note: "",
  bestValue: false,
});
const FAQS = [{ q: "Do my customers need an app?", a: "No." }];

describe("indianPhone", () => {
  it("normalises 10 digits and 91-prefixed numbers", () => {
    assert.equal(indianPhone("98765 43210"), "+919876543210");
    assert.equal(indianPhone("919876543210"), "+919876543210");
  });
  it("rejects anything else", () => {
    assert.equal(indianPhone(""), null);
    assert.equal(indianPhone("12345"), null);
    assert.equal(indianPhone("1234567890"), null);
  });
});

describe("landingJsonLd", () => {
  it("prices every offer in rupees from paise and lists the FAQ", () => {
    const g = landingJsonLd(SITE, [card(1, 29900), card(12, 359900)], FAQS)["@graph"];
    const service = g.find((n) => n["@type"] === "Service") as { offers: { price: string; priceCurrency: string }[] };
    assert.deepEqual(service.offers.map((o) => o.price), ["299.00", "3599.00"]);
    assert.equal(service.offers[0].priceCurrency, "INR");
    const faq = g.find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
    assert.equal(faq.mainEntity[0].name, "Do my customers need an app?");
  });
  it("leaves offers out when no plan has a price, and the phone out until it is set", () => {
    const g = landingJsonLd(SITE, [], FAQS)["@graph"];
    assert.equal("offers" in g.find((n) => n["@type"] === "Service")!, false);
    const org = g.find((n) => n["@type"] === "Organization") as { contactPoint: object[] };
    assert.equal("telephone" in org.contactPoint[0], false);
    const withPhone = landingJsonLd({ ...SITE, whatsappNumber: "9876543210" }, [], FAQS)["@graph"];
    const org2 = withPhone.find((n) => n["@type"] === "Organization") as { contactPoint: { telephone: string }[] };
    assert.equal(org2.contactPoint[0].telephone, "+919876543210");
  });
});

describe("playgroundJsonLd", () => {
  it("is a free web app with a breadcrumb to the home page", () => {
    const g = playgroundJsonLd(SITE, "Try a look", "desc")["@graph"];
    const app = g.find((n) => n["@type"] === "WebApplication") as { isAccessibleForFree: boolean; offers: { price: string } };
    assert.equal(app.isAccessibleForFree, true);
    assert.equal(app.offers.price, "0");
    assert.ok(g.some((n) => n["@type"] === "BreadcrumbList"));
  });
});
