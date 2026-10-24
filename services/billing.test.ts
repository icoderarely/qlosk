import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changePlan,
  formatPlanDate,
  getShopPlan,
  planOptions,
  getBilling,
  markPaid,
  undoPaid,
  paiseFromRupees,
  rupeesFromPaise,
  savePrices,
  type BillingShop,
  type BillingStore,
  type LastRenewal,
  type PlanSnapshot,
  type PlanRow,
} from "./billing.ts";

const NOW = new Date("2026-10-24T12:00:00+05:30");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 3600_000);

const PLANS: PlanRow[] = [
  { id: "p-month", name: "Monthly", months: 1, pricePaise: 49900, isCustom: false },
  { id: "p-year", name: "Yearly", months: 12, pricePaise: 0, isCustom: false },
  { id: "p-custom", name: "17 months", months: 17, pricePaise: 0, isCustom: true },
];

const shop = (id: string, name: string, planId: string | null, endsInDays: number | null, extra: Partial<BillingShop> = {}): BillingShop => ({
  id,
  name,
  status: "live",
  planId,
  planStartedAt: endsInDays === null ? null : days(endsInDays - 30),
  planEndsAt: endsInDays === null ? null : days(endsInDays),
  hasPublished: true,
  phone: null,
  ownerName: null,
  ownerWhatsapp: null,
  ...extra,
});

function fake(shops: BillingShop[], plans: PlanRow[] = PLANS) {
  const renewed: { shopId: string; planStartedAt: Date; planEndsAt: Date; status: string; what: string; before: PlanSnapshot }[] = [];
  const undone: { restore: PlanSnapshot; what: string }[] = [];
  let last: LastRenewal | null = null;
  const priced: { id: string; pricePaise: number }[][] = [];
  const logs: string[] = [];
  const planSet: string[] = [];
  const customMade: PlanRow[] = [];
  const store: BillingStore = {
    async plans() {
      return plans;
    },
    async shops() {
      return shops;
    },
    async find(id) {
      return shops.find((s) => s.id === id) ?? null;
    },
    async renew(args) {
      renewed.push(args);
      last = { logId: "log1", at: NOW, before: args.before, endsAfter: args.planEndsAt };
    },
    async customPlan({ months, pricePaise }) {
      const p: PlanRow = { id: `custom-${months}`, name: `${months} months`, months, pricePaise, isCustom: true };
      customMade.push(p);
      return p;
    },
    async setPlan(args) {
      planSet.push(args.planId);
      logs.push(args.what);
    },
    async lastRenewal() {
      return last;
    },
    async undoRenewal(args) {
      undone.push({ restore: args.restore, what: args.what });
    },
    async setPrices(args) {
      priced.push(args.prices);
      logs.push(args.what);
    },
  };
  return { store, renewed, undone, priced, logs, planSet, customMade, setLast: (l: LastRenewal | null) => (last = l) };
}

describe("prices", () => {
  it("turns rupees into paise and back", () => {
    assert.equal(paiseFromRupees("499"), 49900);
    assert.equal(paiseFromRupees("1,499.50"), 149950);
    assert.equal(paiseFromRupees("₹ 99"), 9900);
    assert.equal(paiseFromRupees(""), 0);
    assert.equal(rupeesFromPaise(49900), "499");
    assert.equal(rupeesFromPaise(149950), "1499.50");
    assert.equal(rupeesFromPaise(0), "");
  });
  it("rejects what is not a price", () => {
    for (const bad of ["abc", "-5", "12.345", "1e3", "99999999"]) assert.equal(paiseFromRupees(bad), null, bad);
  });
});

describe("formatPlanDate", () => {
  it("leaves out the year when it is this year", () => {
    assert.equal(formatPlanDate(new Date("2026-11-05T10:00:00Z"), NOW), "5 Nov");
    assert.equal(formatPlanDate(new Date("2027-01-02T10:00:00Z"), NOW), "2 Jan 2027");
  });
});

describe("getBilling", () => {
  const shops = [
    shop("a", "Kaveri Sweets", "p-month", 5, { ownerWhatsapp: "98200 12345", ownerName: "Kaveri" }),
    shop("b", "Green Leaf", "p-month", -3, { ownerWhatsapp: "98200 54321" }),
    shop("c", "Noor Boutique", "p-year", 118),
    shop("d", "Iron House", "p-custom", 1750),
    shop("e", "No plan yet", null, null),
    shop("f", "Archived", "p-year", -100, { status: "archived" }),
  ];

  it("counts shops per plan and what is due", async () => {
    const b = await getBilling(fake(shops.filter((s) => s.status !== "archived")).store, NOW);
    assert.deepEqual(b.planCounts, [
      { plan: "Monthly", shops: 2 },
      { plan: "Yearly", shops: 1 },
      { plan: "Custom", shops: 1 },
    ]);
    assert.deepEqual(b.due, { inDays: 14, count: 1, overdue: 1 });
  });

  it("lists overdue first, then due soon, then paid", async () => {
    const b = await getBilling(fake(shops.filter((s) => s.status !== "archived")).store, NOW);
    assert.deepEqual(b.renewals.map((r) => [r.shop, r.payment]), [
      ["Green Leaf", "overdue"],
      ["Kaveri Sweets", "due_soon"],
      ["Noor Boutique", "paid"],
      ["Iron House", "paid"],
    ]);
  });

  it("builds a WhatsApp reminder with the plan, the date and the price", async () => {
    const b = await getBilling(fake(shops.filter((s) => s.status !== "archived")).store, NOW);
    const kaveri = b.renewals.find((r) => r.shop === "Kaveri Sweets");
    assert.ok(kaveri?.remindHref?.startsWith("https://wa.me/919820012345?text="));
    const text = decodeURIComponent(kaveri?.remindHref?.split("?text=")[1] ?? "");
    assert.match(text, /Hi Kaveri/);
    assert.match(text, /Monthly plan for Kaveri Sweets ends on 29 Oct/);
    assert.match(text, /₹499/);
    assert.equal(kaveri?.callHref, "tel:+919820012345");
  });

  it("says what happens after the plan ends when it already has", async () => {
    const b = await getBilling(fake(shops.filter((s) => s.status !== "archived")).store, NOW);
    const text = decodeURIComponent(b.renewals.find((r) => r.shop === "Green Leaf")?.remindHref?.split("?text=")[1] ?? "");
    assert.match(text, /ended on 21 Oct/);
    assert.match(text, /stays live until 5 Nov/);
  });

  it("does not remind a paid shop and has no link without an owner number", async () => {
    const b = await getBilling(fake(shops.filter((s) => s.status !== "archived")).store, NOW);
    assert.equal(b.renewals.find((r) => r.shop === "Noor Boutique")?.remindHref, null);
    assert.equal(b.renewals.find((r) => r.shop === "Noor Boutique")?.callHref, null);
  });

  it("shows the saved prices in rupees", async () => {
    const b = await getBilling(fake([]).store, NOW);
    assert.deepEqual(b.prices, [
      { id: "p-month", plan: "Monthly", rupees: "499" },
      { id: "p-year", plan: "Yearly", rupees: "" },
    ]);
  });
});

describe("markPaid", () => {
  it("adds the period to a plan that is still running", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    const result = await markPaid(f.store, "a", "me@example.com", NOW);
    assert.deepEqual(result, { ok: true, message: "Kaveri is paid up until 29 Nov." });
    assert.equal(f.renewed[0].planEndsAt.toISOString().slice(0, 10), "2026-11-29");
    assert.match(f.renewed[0].what, /Monthly plan \(₹499\) runs until 29 Nov/);
  });

  it("brings an expired shop back to live", async () => {
    const f = fake([shop("a", "Old Town", "p-year", -40, { status: "expired" })]);
    const result = await markPaid(f.store, "a", "me", NOW);
    assert.equal(result.ok, true);
    assert.equal(f.renewed[0].status, "live");
    assert.equal(f.renewed[0].planEndsAt.toISOString().slice(0, 10), "2027-10-24");
    assert.match(f.renewed[0].what, /fully live again/);
  });

  it("puts an expired shop with no published page back to building", async () => {
    const f = fake([shop("a", "Draft only", "p-year", -40, { status: "expired", hasPublished: false })]);
    await markPaid(f.store, "a", "me", NOW);
    assert.equal(f.renewed[0].status, "building");
  });

  it("starts the plan for a shop that never started", async () => {
    const f = fake([shop("a", "New", "p-custom", null)]);
    await markPaid(f.store, "a", "me", NOW);
    assert.equal(f.renewed[0].planEndsAt.toISOString().slice(0, 10), "2028-03-24");
  });

  it("refuses a shop with no plan or no longer there", async () => {
    const f = fake([shop("a", "No plan", null, null)]);
    assert.equal((await markPaid(f.store, "a", "me", NOW)).ok, false);
    assert.equal((await markPaid(f.store, "zzz", "me", NOW)).ok, false);
    assert.equal(f.renewed.length, 0);
  });
});

describe("savePrices", () => {
  it("writes only the prices that changed and logs them", async () => {
    const f = fake([]);
    const result = await savePrices(f.store, { "p-month": "499", "p-year": "4,999", "p-custom": "" }, "me@example.com");
    assert.deepEqual(result, { ok: true, message: "Prices saved." });
    assert.deepEqual(f.priced[0], [{ id: "p-year", pricePaise: 499900 }]);
    assert.equal(f.logs[0], "Plan prices changed: Yearly not set to ₹4,999");
  });
  it("saves nothing when a price is not a number, or nothing changed", async () => {
    const f = fake([]);
    const bad = await savePrices(f.store, { "p-month": "cheap" }, "me");
    assert.equal(bad.ok, false);
    const same = await savePrices(f.store, { "p-month": "499" }, "me");
    assert.deepEqual(same, { ok: true, message: "No price changed." });
    assert.equal(f.priced.length, 0);
  });
});

describe("undoPaid", () => {
  it("restores the dates from before the payment", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    await markPaid(f.store, "a", "me", NOW);
    // the fake shop is not mutated, so show it the way the store would after the renewal
    const renewedEnd = f.renewed[0].planEndsAt;
    const after = fake([shop("a", "Kaveri", "p-month", 5, { planEndsAt: renewedEnd })]);
    after.setLast({ logId: "log1", at: NOW, before: f.renewed[0].before, endsAfter: renewedEnd });
    const result = await undoPaid(after.store, "a", "me", NOW);
    assert.equal(result.ok, true);
    assert.equal(after.undone[0].restore.planEndsAt?.getTime(), days(5).getTime());
  });

  it("refuses when the end date has changed since", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    f.setLast({ logId: "log1", at: NOW, before: { planStartedAt: null, planEndsAt: null, status: "live" }, endsAfter: days(99) });
    assert.equal((await undoPaid(f.store, "a", "me", NOW)).ok, false);
    assert.equal(f.undone.length, 0);
  });

  it("refuses when the payment is more than a day old, or there is none", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    assert.equal((await undoPaid(f.store, "a", "me", NOW)).ok, false);
    f.setLast({ logId: "log1", at: days(-2), before: { planStartedAt: null, planEndsAt: null, status: "live" }, endsAfter: days(5) });
    assert.equal((await undoPaid(f.store, "a", "me", NOW)).ok, false);
  });
});

describe("planOptions", () => {
  const plans: PlanRow[] = [
    { id: "m", name: "Monthly", months: 1, pricePaise: 29900, isCustom: false },
    { id: "h", name: "Half yearly", months: 6, pricePaise: 119900, isCustom: false },
    { id: "y", name: "Yearly", months: 12, pricePaise: 199900, isCustom: false },
    { id: "n", name: "Unpriced", months: 3, pricePaise: 0, isCustom: false },
  ];

  it("works out the price per month and the saving against paying monthly", () => {
    const [m, h, y, n] = planOptions(plans);
    assert.deepEqual([m.bestValue, h.bestValue, y.bestValue], [false, false, true]);
    assert.equal(m.perMonth, "₹299 a month");
    assert.equal(m.saving, "");
    assert.equal(h.perMonth, "₹200 a month");
    assert.equal(h.saving, "Save 33% vs monthly");
    assert.equal(y.price, "₹1,999");
    assert.equal(y.perMonth, "₹167 a month");
    assert.equal(y.saving, "Save 44% vs monthly");
    assert.equal(n.price, "Price not set");
    assert.equal(n.perMonth, "");
  });
});

describe("custom plans", () => {
  it("creates a custom length with its price and puts the shop on it", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    const r = await changePlan(f.store, "a", { custom: { months: 17, rupees: "3,499" } }, "me");
    assert.equal(r.ok, true);
    assert.deepEqual(f.customMade.map((p) => [p.months, p.pricePaise]), [[17, 349900]]);
    assert.deepEqual(f.planSet, ["custom-17"]);
  });

  it("uses the standard plan when the custom length matches one", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    await changePlan(f.store, "a", { custom: { months: 12, rupees: "" } }, "me");
    assert.deepEqual(f.planSet, ["p-year"]);
    assert.equal(f.customMade.length, 0);
  });

  it("rejects a bad length or price", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    for (const custom of [{ months: 0, rupees: "" }, { months: 1.5, rupees: "" }, { months: 500, rupees: "" }, { months: 17, rupees: "abc" }]) {
      assert.equal((await changePlan(f.store, "a", { custom }, "me")).ok, false);
    }
    assert.equal(f.planSet.length, 0);
  });

  it("shows a shop's custom plan in the form and counts custom shops together", async () => {
    const f = fake([shop("a", "Iron", "p-custom", 400)]);
    const data = await getShopPlan(f.store, "a", NOW);
    assert.deepEqual(data?.custom, { months: 17, rupees: "" });
    assert.equal(data?.options.some((o) => o.name === "17 months"), false);
    const billing = await getBilling(f.store, NOW);
    assert.deepEqual(billing.planCounts.at(-1), { plan: "Custom", shops: 1 });
  });
});

describe("changePlan and getShopPlan", () => {
  it("sets the plan, logs it, and leaves the dates alone", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    const result = await changePlan(f.store, "a", { planId: "p-year" }, "me");
    assert.equal(result.ok, true);
    assert.deepEqual(f.planSet, ["p-year"]);
    assert.match(f.logs[0], /Monthly to Yearly/);
  });

  it("does nothing for the plan it is already on, or an unknown plan", async () => {
    const f = fake([shop("a", "Kaveri", "p-month", 5)]);
    assert.equal((await changePlan(f.store, "a", { planId: "p-month" }, "me")).ok, true);
    assert.equal((await changePlan(f.store, "a", { planId: "nope" }, "me")).ok, false);
    assert.equal((await changePlan(f.store, "zzz", { planId: "p-year" }, "me")).ok, false);
    assert.equal(f.planSet.length, 0);
  });

  it("explains a missing reminder link", async () => {
    const none = fake([shop("a", "Kaveri", null, null)]);
    assert.equal((await getShopPlan(none.store, "a", NOW))?.remindNote, "Choose a plan first.");
    const noNumber = fake([shop("b", "Noor", "p-month", 3)]);
    assert.match((await getShopPlan(noNumber.store, "b", NOW))?.remindNote ?? "", /WhatsApp/);
    const paid = fake([shop("c", "Iron", "p-month", 60, { ownerWhatsapp: "+919800000001" })]);
    const data = await getShopPlan(paid.store, "c", NOW);
    assert.equal(data?.payment, "paid");
    assert.equal(data?.remindHref, null);
    const due = fake([shop("d", "Dental", "p-month", 3, { ownerWhatsapp: "+919800000001" })]);
    assert.match((await getShopPlan(due.store, "d", NOW))?.remindHref ?? "", /^https:\/\/wa\.me\//);
  });
});
