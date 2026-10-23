import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  axisIndexes,
  buttonCounts,
  changeNote,
  csvCell,
  getOverview,
  getReports,
  monthlyReport,
  parseRange,
  previousMonth,
  reportsCsv,
  type HeldShop,
  type ShopFacts,
  type StatDay,
  type StatsStore,
} from "./stats.ts";

// "Now" is 24 Oct 2026, noon in India. The last 7 days are 18..24 Oct.
const NOW = new Date("2026-10-24T12:00:00+05:30");

const shop = (id: string, name: string, extra: Partial<ShopFacts> = {}): ShopFacts => ({
  id,
  name,
  status: "live",
  stage: "live",
  stageChangedAt: new Date("2026-09-01T00:00:00Z"),
  createdAt: new Date("2026-09-01T00:00:00Z"),
  code: null,
  planName: null,
  planEndsAt: null,
  ownerName: null,
  ownerWhatsapp: null,
  ...extra,
});

const row = (shopId: string, day: string, extra: Partial<StatDay> = {}): StatDay => ({
  shopId,
  day,
  scans: 0,
  taps: 0,
  botScans: 0,
  botTaps: 0,
  heldScans: 0,
  flagReasons: {},
  tapsByLink: {},
  ...extra,
});

function fake(shops: ShopFacts[], rows: StatDay[], held: HeldShop[] = [], types: Record<string, "whatsapp" | "call" | "google_review"> = {}): StatsStore {
  return {
    async days(from, to) {
      return rows.filter((r) => r.day >= from && r.day <= to);
    },
    async shops() {
      return shops;
    },
    async linkTypes() {
      return types;
    },
    async held() {
      return held;
    },
  };
}

const TYPES = { w1: "whatsapp", c1: "call", g1: "google_review" } as const;

describe("parseRange", () => {
  it("accepts 7, 30 and 90 and falls back to 30", () => {
    assert.equal(parseRange("7"), 7);
    assert.equal(parseRange(["90"]), 90);
    assert.equal(parseRange("12"), 30);
    assert.equal(parseRange(undefined), 30);
  });
});

describe("changeNote", () => {
  it("compares with the previous period", () => {
    assert.deepEqual(changeNote(112, 100, 30), { note: "+12% vs previous 30 days", tone: "up" });
    assert.deepEqual(changeNote(50, 100, 7), { note: "-50% vs previous 7 days", tone: "warn" });
  });
  it("does not divide by zero", () => {
    assert.equal(changeNote(0, 0, 30).note, "No counted scans yet");
    assert.equal(changeNote(5, 0, 30).note, "Up from none in the previous 30 days");
  });
});

describe("buttonCounts", () => {
  it("adds taps by button type, most used first, and names removed links", () => {
    const rows = [
      row("a", "2026-10-20", { tapsByLink: { w1: 3, c1: 1 } }),
      row("b", "2026-10-21", { tapsByLink: { w1: 2, gone: 1, c1: 1 } }),
    ];
    assert.deepEqual(buttonCounts(rows, TYPES), [
      { label: "WhatsApp", count: 5 },
      { label: "Call", count: 2 },
      { label: "Removed buttons", count: 1 },
    ]);
  });
});

describe("axisIndexes", () => {
  it("spreads four labels and copes with short ranges", () => {
    assert.deepEqual(axisIndexes(30), [0, 10, 19, 29]);
    assert.deepEqual(axisIndexes(1), [0]);
  });
});

describe("getOverview", () => {
  // Hand count for the last 30 days (25 Sep to 24 Oct): scans 10 + 20 + 5 = 35,
  // taps 4 + 8 + 1 = 13. Held and bot scans are not counted. Before that
  // (previous 30 days) there were 20 counted scans.
  const shops = [
    shop("a", "Alpha", { createdAt: new Date("2026-10-02T00:00:00Z"), code: "AAAAAA" }),
    shop("b", "Beta"),
    shop("c", "Gamma", { status: "building", stage: "building" }),
  ];
  const rows = [
    row("a", "2026-10-20", { scans: 10, taps: 4, botScans: 7, tapsByLink: { w1: 3, c1: 1 } }),
    row("b", "2026-10-22", { scans: 20, taps: 8, heldScans: 30, botScans: 30, tapsByLink: { w1: 4, g1: 4 } }),
    row("a", "2026-10-24", { scans: 5, taps: 1, tapsByLink: { g1: 1 } }),
    row("a", "2026-09-10", { scans: 20 }),
  ];

  it("reports counted numbers only", async () => {
    const o = await getOverview(fake(shops, rows, [], TYPES), 30, NOW);
    const by = Object.fromEntries(o.kpis.map((k) => [k.label, k]));
    assert.equal(by["Live shops"].value, "2");
    assert.equal(by["Live shops"].note, "1 added this month");
    assert.equal(by["Scans"].value, "35");
    assert.equal(by["Scans"].note, "+75% vs previous 30 days");
    assert.equal(by["Button taps"].value, "13");
    assert.equal(by["Button taps"].note, "37% of scans tapped a button");
  });

  it("draws one point per day with counted scans", async () => {
    const o = await getOverview(fake(shops, rows, [], TYPES), 30, NOW);
    assert.equal(o.scansSeries.length, 30);
    assert.equal(o.scansSeries.reduce((n, p) => n + p.value, 0), 35);
    assert.equal(o.scansSeries[29].value, 5);
    assert.equal(o.scansAxis[0].text, "Sep 25");
    assert.equal(o.scansAxis[3].text, "Oct 24");
  });

  it("gives button shares of counted taps", async () => {
    const o = await getOverview(fake(shops, rows, [], TYPES), 30, NOW);
    // 13 tapsByLink taps: whatsapp 7, google review 5, call 1.
    assert.deepEqual(o.buttons, [
      { label: "WhatsApp", percent: 54 },
      { label: "Google review", percent: 38 },
      { label: "Call", percent: 8 },
    ]);
  });

  it("uses the chosen range", async () => {
    const o = await getOverview(fake(shops, rows, [], TYPES), 7, NOW);
    assert.equal(o.scansSeries.length, 7);
    assert.equal(o.kpis.find((k) => k.label === "Scans")?.value, "35");
  });

  it("asks about a quiet shop, a waiting preview, and held traffic", async () => {
    const list = [
      shop("a", "Alpha"),
      shop("p", "Pending", { stage: "preview_sent", status: "preview", stageChangedAt: new Date("2026-10-20T00:00:00Z"), ownerWhatsapp: "98200 12345" }),
    ];
    const o = await getOverview(fake(list, [], [{ shopId: "a", scans: 40, firstDay: "2026-10-22", lastDay: "2026-10-22" }]), 30, NOW);
    assert.equal(o.attention[0].title, "Unusual traffic to review");
    const nudge = o.attention.find((a) => a.title === "Preview waiting for approval");
    assert.ok(nudge?.href.startsWith("https://wa.me/919820012345"));
    assert.ok(o.attention.some((a) => a.title === "No scans in 7 days" && a.detail.startsWith("Pending") === false));
  });

  it("counts renewals due in the next 14 days", async () => {
    const list = [
      shop("a", "Alpha", { planEndsAt: new Date("2026-11-02T00:00:00Z") }),
      shop("b", "Beta", { planEndsAt: new Date("2026-12-30T00:00:00Z") }),
    ];
    const o = await getOverview(fake(list, []), 30, NOW);
    assert.equal(o.kpis.find((k) => k.label === "Renewals due")?.value, "1");
  });
});

describe("getReports", () => {
  const shops = [
    shop("a", "Alpha", { ownerName: "Asha", ownerWhatsapp: "9820012345" }),
    shop("b", "Beta"),
    shop("q", "Quiet shop"),
  ];
  // Alpha: 40 scans, 16 taps. Beta: 100 scans counted, 60 held for review.
  const rows = [
    row("a", "2026-10-17", { scans: 25, taps: 10, botScans: 5, tapsByLink: { w1: 8, c1: 2 }, flagReasons: { crawler: 4, duplicate: 1 } }),
    row("a", "2026-10-18", { scans: 15, taps: 6, botTaps: 2, tapsByLink: { w1: 6 }, flagReasons: { no_token: 2 } }),
    row("b", "2026-10-21", { scans: 100, taps: 20, botScans: 60, heldScans: 60, tapsByLink: { g1: 20 }, flagReasons: { spike_review: 60 } }),
  ];
  const held: HeldShop[] = [{ shopId: "b", scans: 60, firstDay: "2026-10-21", lastDay: "2026-10-21" }];

  it("matches a hand count", async () => {
    const r = await getReports(fake(shops, rows, held, TYPES), 30, NOW);
    const by = Object.fromEntries(r.kpis.map((k) => [k.label, k]));
    assert.equal(by["Counted scans"].value, "140");
    assert.equal(by["Button taps"].value, "36");
    assert.equal(by["Button taps"].note, "26% tap rate");
    // Filtered: bot scans 5 + 60, bot taps 2 = 67 of 140 + 36 + 67 requests (28%).
    assert.equal(by["Filtered traffic"].value, "67");
    assert.equal(by["Filtered traffic"].note, "28% of all requests");
    // 100 scans on Wed 21 Oct, the busiest day.
    assert.equal(by["Busiest day"].value, "Wednesday");
  });

  it("breaks the filtered traffic down by reason", async () => {
    const r = await getReports(fake(shops, rows, held, TYPES), 30, NOW);
    assert.equal(r.traffic.counted, 176);
    assert.equal(r.traffic.filtered, 67);
    assert.deepEqual(r.traffic.reasons, [
      { label: "Held for review (unusual traffic)", count: 60 },
      { label: "Crawlers and link previews", count: 4 },
      { label: "Tap without a signed page token", count: 2 },
      { label: "Repeats within 30 seconds", count: 1 },
    ]);
  });

  it("flags the spike shop and the quiet shop", async () => {
    const r = await getReports(fake(shops, rows, held, TYPES), 30, NOW);
    const by = Object.fromEntries(r.byShop.map((s) => [s.name, s]));
    assert.equal(by["Beta"].flag, "spike");
    assert.equal(by["Beta"].scans, 100);
    assert.equal(by["Alpha"].flag, "clean");
    assert.equal(by["Alpha"].tapRate, 40);
    assert.equal(by["Alpha"].topButton, "WhatsApp");
    assert.equal(by["Quiet shop"].flag, "quiet");
    assert.equal(by["Quiet shop"].tapRate, null);
    assert.equal(r.unusual.length, 1);
    assert.equal(r.unusual[0].shop, "Beta");
  });
});

describe("monthly report", () => {
  it("covers the calendar month before this one", () => {
    assert.deepEqual(previousMonth(NOW), { first: "2026-09-01", last: "2026-09-30", label: "September 2026" });
    assert.equal(previousMonth(new Date("2026-01-05T10:00:00+05:30")).first, "2025-12-01");
  });

  const shops = [
    shop("a", "Alpha", { ownerName: "Asha", ownerWhatsapp: "9820012345" }),
    shop("b", "Beta"),
  ];
  const rows = [
    row("a", "2026-09-05", { scans: 30, taps: 9, tapsByLink: { w1: 9 } }),
    row("a", "2026-09-12", { scans: 12, taps: 3, tapsByLink: { c1: 3 } }),
    row("b", "2026-09-20", { scans: 200, taps: 50 }),
    row("a", "2026-10-02", { scans: 99 }),
  ];

  it("writes the owner's numbers and nothing else", async () => {
    const m = await monthlyReport(fake(shops, rows, [], TYPES), NOW, "a");
    assert.equal(m.monthLabel, "September 2026");
    assert.equal(m.preview?.scans, 42);
    assert.equal(m.preview?.taps, 12);
    assert.match(m.preview?.text ?? "", /42 people scanned your QR code and 12 tapped a button/);
    assert.match(m.preview?.text ?? "", /most used button was WhatsApp/);
    assert.ok(m.preview?.whatsappHref?.startsWith("https://wa.me/919820012345?text="));
  });

  it("leaves a spike shop out until an admin decides", async () => {
    const held: HeldShop[] = [{ shopId: "b", scans: 150, firstDay: "2026-09-20", lastDay: "2026-09-20" }];
    const m = await monthlyReport(fake(shops, rows, held, TYPES), NOW, "b");
    assert.deepEqual(m.heldOut, [{ shopId: "b", name: "Beta" }]);
    assert.deepEqual(m.ready.map((e) => e.name), ["Alpha"]);
    assert.equal(m.preview, null);
  });

  it("says plainly when there were no scans", async () => {
    const m = await monthlyReport(fake([shop("z", "Zed")], []), NOW, "z");
    assert.match(m.preview?.text ?? "", /No scans were counted this month/);
  });
});

describe("CSV", () => {
  it("quotes commas and quotes", () => {
    assert.equal(csvCell('Dr. "Mehta", Dental'), '"Dr. ""Mehta"", Dental"');
  });
  it("stops a shop name from running as a spreadsheet formula", () => {
    assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
    assert.equal(csvCell("+91 shop"), "'+91 shop");
  });
  it("lists every shop with its counted numbers", async () => {
    const r = await getReports(fake([shop("a", "Alpha")], [row("a", "2026-10-20", { scans: 10, taps: 4, botScans: 2 })]), 30, NOW);
    assert.equal(
      reportsCsv(r),
      "Shop,Counted scans,Button taps,Tap rate %,Top button,Filtered requests,Flag\r\nAlpha,10,4,40,,2,Clean\r\n",
    );
  });
});
