import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addMonths,
  graceEnds,
  cheapestMonth,
  isReduced,
  landingPlans,
  pricingCard,
  paymentState,
  renewalDates,
  runPlanExpiry,
  showsMultiMonthStrike,
  statusAfterRenewal,
  type ExpiryStore,
} from "./plans.ts";
import type { DbShopStatus } from "./shops.ts";

const NOW = new Date("2026-10-24T12:00:00+05:30");
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 24 * 3600_000);

describe("addMonths", () => {
  it("adds calendar months and clamps short months", () => {
    assert.equal(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2026-02-28");
    assert.equal(addMonths(new Date("2028-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2028-02-29");
    assert.equal(addMonths(new Date("2026-10-24T00:00:00Z"), 12).toISOString().slice(0, 10), "2027-10-24");
    assert.equal(addMonths(new Date("2026-10-24T00:00:00Z"), 60).toISOString().slice(0, 10), "2031-10-24");
    assert.equal(addMonths(new Date("2026-11-30T00:00:00Z"), 3).toISOString().slice(0, 10), "2027-02-28");
  });
});

describe("paymentState", () => {
  it("is paid, due soon, overdue or not started", () => {
    assert.equal(paymentState(daysFromNow(200), NOW), "paid");
    assert.equal(paymentState(daysFromNow(15), NOW), "paid");
    assert.equal(paymentState(daysFromNow(14), NOW), "due_soon");
    assert.equal(paymentState(daysFromNow(1), NOW), "due_soon");
    assert.equal(paymentState(daysFromNow(-1), NOW), "overdue");
    assert.equal(paymentState(null, NOW), "not_started");
  });
});

describe("isReduced", () => {
  it("keeps the page fully live for 15 days after the plan ends", () => {
    assert.equal(isReduced({ status: "live", planEndsAt: daysFromNow(-1) }, NOW), false);
    assert.equal(isReduced({ status: "live", planEndsAt: daysFromNow(-14.9) }, NOW), false);
  });
  it("reduces the page from day 15, even if the job has not run", () => {
    assert.equal(isReduced({ status: "live", planEndsAt: daysFromNow(-15) }, NOW), true);
    assert.equal(isReduced({ status: "live", planEndsAt: daysFromNow(-40) }, NOW), true);
  });
  it("reduces an expired shop and leaves a shop with no plan dates alone", () => {
    assert.equal(isReduced({ status: "expired", planEndsAt: null }, NOW), true);
    assert.equal(isReduced({ status: "live", planEndsAt: null }, NOW), false);
    assert.equal(isReduced({ status: "live", planEndsAt: daysFromNow(30) }, NOW), false);
  });
  it("starts the grace period at the end date", () => {
    assert.equal(graceEnds(new Date("2026-10-01T00:00:00Z")).toISOString(), "2026-10-16T00:00:00.000Z");
  });
});

describe("renewalDates", () => {
  const started = new Date("2025-11-01T00:00:00Z");
  it("adds the period on to a plan that is still running", () => {
    const ends = new Date("2026-11-01T00:00:00Z");
    const r = renewalDates({ planStartedAt: started, planEndsAt: ends, months: 12, now: NOW });
    assert.equal(r.planStartedAt, started);
    assert.equal(r.planEndsAt.toISOString().slice(0, 10), "2027-11-01");
  });
  it("starts a new period today when the plan has ended or never started", () => {
    const lapsed = renewalDates({ planStartedAt: started, planEndsAt: daysFromNow(-3), months: 1, now: NOW });
    assert.equal(lapsed.planStartedAt, NOW);
    assert.equal(lapsed.planEndsAt.toISOString().slice(0, 10), "2026-11-24");
    const fresh = renewalDates({ planStartedAt: null, planEndsAt: null, months: 12, now: NOW });
    assert.equal(fresh.planEndsAt.toISOString().slice(0, 10), "2027-10-24");
  });
});

describe("statusAfterRenewal", () => {
  it("brings an expired shop back and leaves other statuses alone", () => {
    assert.equal(statusAfterRenewal("expired", true), "live");
    assert.equal(statusAfterRenewal("expired", false), "building");
    for (const s of ["live", "quiet", "paused", "preview"] as DbShopStatus[]) assert.equal(statusAfterRenewal(s, true), s);
  });
});

describe("runPlanExpiry", () => {
  function fake(rows: { id: string; name: string; status: DbShopStatus; planEndsAt: Date | null }[]) {
    const expired: string[] = [];
    const store: ExpiryStore = {
      async candidates() {
        return rows;
      },
      async markExpired(shops) {
        expired.push(...shops.map((s) => s.id));
      },
    };
    return { store, expired };
  }

  it("expires only live or quiet shops more than 15 days past their end date", async () => {
    const { store, expired } = fake([
      { id: "a", name: "Long gone", status: "live", planEndsAt: daysFromNow(-30) },
      { id: "b", name: "Quiet and gone", status: "quiet", planEndsAt: daysFromNow(-16) },
      { id: "c", name: "In grace", status: "live", planEndsAt: daysFromNow(-5) },
      { id: "d", name: "Running", status: "live", planEndsAt: daysFromNow(90) },
      { id: "e", name: "Paused", status: "paused", planEndsAt: daysFromNow(-60) },
      { id: "f", name: "No dates", status: "live", planEndsAt: null },
    ]);
    const result = await runPlanExpiry(store, NOW);
    assert.deepEqual(expired, ["a", "b"]);
    assert.deepEqual(result.expired, ["Long gone", "Quiet and gone"]);
  });

  it("does nothing, and writes nothing, when no shop is due", async () => {
    const { store, expired } = fake([{ id: "d", name: "Running", status: "live", planEndsAt: daysFromNow(90) }]);
    assert.deepEqual((await runPlanExpiry(store, NOW)).expired, []);
    assert.deepEqual(expired, []);
  });
});

describe("landing pricing cards", () => {
  const row = (months: number, pricePaise: number, compareAtPaise: number | null = null) => ({
    id: String(months),
    months,
    pricePaise,
    compareAtPaise,
  });

  it("strikes the compare-at price only when it is set and higher", () => {
    assert.equal(pricingCard(row(1, 29900))?.was, null);
    assert.equal(pricingCard(row(12, 199900, null))?.was, null);
    assert.equal(pricingCard(row(12, 199900, 199900))?.was, null);
    assert.equal(pricingCard(row(12, 199900, 358800))?.was, "₹3,588");
  });

  it("works out the monthly rate and the saving from the data", () => {
    const year = pricingCard(row(12, 199900, 358800));
    assert.equal(year?.price, "₹1,999");
    assert.equal(year?.per, "/ year");
    assert.equal(year?.note, "₹167 a month · save 44%");
    assert.equal(year?.bestValue, true);
    const half = pricingCard(row(6, 119900, 179400));
    assert.equal(half?.note, "₹200 a month · save 33%");
    assert.equal(half?.title, "6 months");
  });

  it("calls a struck 1-month price a launch price and says nothing without one", () => {
    assert.equal(pricingCard(row(1, 29900, 39900))?.note, "Launch price");
    assert.equal(pricingCard(row(1, 29900))?.note, "");
  });

  it("leaves out a plan with no price", () => {
    assert.equal(pricingCard(row(6, 0)), null);
  });

  it("returns 1 month, 6 months and 1 year in that order and ignores other lengths", async () => {
    const cards = await landingPlans({
      standardPlans: async () => [row(12, 199900, 358800), row(3, 50000), row(1, 29900), row(6, 119900, 179400)],
    });
    assert.deepEqual(cards.map((c) => c.months), [1, 6, 12]);
    assert.equal(showsMultiMonthStrike(cards), true);
    assert.equal(showsMultiMonthStrike(cards.filter((c) => c.months === 1)), false);
  });
});

describe("cheapestMonth", () => {
  it("is the plan with the lowest monthly rate, not the lowest price", async () => {
    const cards = await landingPlans({
      standardPlans: async () => [
        { id: "1", months: 1, pricePaise: 29900, compareAtPaise: 39900 },
        { id: "6", months: 6, pricePaise: 119900, compareAtPaise: 179400 },
        { id: "12", months: 12, pricePaise: 199900, compareAtPaise: 358800 },
      ],
    });
    assert.equal(cheapestMonth(cards)?.perMonth, "₹167");
    assert.equal(cheapestMonth([]), null);
  });
});
