import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { llmsTxt } from "./llms-txt.ts";
import type { PricingCard } from "./plans.ts";

const base = { name: "Qlosk", url: "https://qlosk.com", description: "d", email: "support@qlosk.com", faqs: [{ q: "Q?", a: "A." }] };
const plan: PricingCard = {
  months: 1, title: "1 month", price: "₹299", pricePaise: 29900, per: "/ month",
  perMonth: "₹299", perMonthPaise: 29900, was: null, note: "", bestValue: false,
};

describe("llmsTxt", () => {
  it("lists live prices, the pages and the FAQ", () => {
    const t = llmsTxt({ ...base, plans: [plan] });
    assert.match(t, /^# Qlosk/);
    assert.match(t, /- 1 month: ₹299 \/ month/);
    assert.match(t, /\[Playground\]\(https:\/\/qlosk\.com\/playground\)/);
    assert.match(t, /### Q\?\nA\./);
  });
  it("never prints a price when none is set", () => {
    const t = llmsTxt({ ...base, plans: [] });
    assert.doesNotMatch(t, /₹/);
    assert.match(t, /Message us on WhatsApp/);
  });
});
