// Fake numbers for Overview and Reports, from docs/design/AdminApp.dc.html.
export type Tone = "up" | "warn" | "mut";

export type Kpi = { label: string; value: string; note: string; tone: Tone };

export type SeriesPoint = { value: number };

export type MockOverview = {
  kpis: Kpi[];
  /** Counted scans, oldest first. The design draws 14 points over 30 days. */
  scansSeries: SeriesPoint[];
  /** Labels under the chart: the point index each one sits under. */
  scansAxis: { index: number; text: string }[];
  buttons: { label: string; percent: number }[];
  attention: { title: string; detail: string; action: string }[];
  /** Ids of the shops shown under Recent shops. */
  recentShopIds: string[];
};

// Values read off the design's chart: 0 sits at y=190 and 600 at y=25.
export const OVERVIEW: MockOverview = {
  kpis: [
    { label: "Live shops", value: "42", note: "+5 this month", tone: "up" },
    { label: "Scans", value: "18,640", note: "+12% vs previous 30 days", tone: "up" },
    { label: "Button taps", value: "7,905", note: "42% of scans tapped a button", tone: "mut" },
    { label: "Renewals due", value: "6", note: "In the next 14 days", tone: "warn" },
  ],
  scansSeries: [
    150, 182, 164, 255, 236, 327, 291, 364, 346, 436, 400, 473, 455, 527,
  ].map((value) => ({ value })),
  scansAxis: [
    { index: 0, text: "Sep 24" },
    { index: 4, text: "Oct 3" },
    { index: 8, text: "Oct 12" },
    { index: 13, text: "Oct 23" },
  ],
  buttons: [
    { label: "WhatsApp", percent: 38 },
    { label: "Google review", percent: 27 },
    { label: "Wi-Fi password", percent: 18 },
    { label: "Call", percent: 10 },
    { label: "Instagram", percent: 7 },
  ],
  attention: [
    { title: "Preview waiting for approval", detail: "Brew & Bun Cafe · sent 2 days ago", action: "Nudge" },
    { title: "Plan ends in 5 days", detail: "Kaveri Sweets · Monthly", action: "Remind" },
    { title: "Standee ready to ship", detail: "Aarav Jewellers · printed", action: "Mark shipped" },
    { title: "No scans in 7 days", detail: "Dr. Mehta Dental · check the standee", action: "Open" },
  ],
  recentShopIds: ["1", "2", "3", "4", "5"],
};

export type ReportShopFlag = "clean" | "spike" | "quiet";

export type MockReports = {
  kpis: Kpi[];
  byShop: {
    name: string;
    scans: number;
    taps: number;
    /** null when the shop has no scans. */
    tapRate: number | null;
    topButton: string | null;
    flag: ReportShopFlag;
    flagLabel: string;
  }[];
  traffic: {
    counted: number;
    filtered: number;
    reasons: { label: string; count: number }[];
  };
  unusual: { shop: string; detail: string }[];
  monthly: { text: string };
};

export const REPORTS: MockReports = {
  kpis: [
    { label: "Counted scans", value: "18,640", note: "+12% vs previous 30 days", tone: "up" },
    { label: "Button taps", value: "7,905", note: "42% tap rate", tone: "mut" },
    { label: "Filtered traffic", value: "783", note: "4% of all requests", tone: "warn" },
    { label: "Busiest day", value: "Saturday", note: "Across all shops", tone: "mut" },
  ],
  byShop: [
    { name: "Velvet Salon & Spa", scans: 1204, taps: 512, tapRate: 43, topButton: "WhatsApp", flag: "clean", flagLabel: "Clean" },
    { name: "Kaveri Sweets", scans: 862, taps: 344, tapRate: 40, topButton: "Google review", flag: "clean", flagLabel: "Clean" },
    { name: "Iron House Gym", scans: 640, taps: 240, tapRate: 38, topButton: "Wi-Fi password", flag: "spike", flagLabel: "Spike to review" },
    { name: "Noor Boutique", scans: 318, taps: 147, tapRate: 46, topButton: "Instagram", flag: "clean", flagLabel: "Clean" },
    { name: "Bright Minds Classes", scans: 207, taps: 81, tapRate: 39, topButton: "Call", flag: "clean", flagLabel: "Clean" },
    { name: "Dr. Mehta Dental", scans: 0, taps: 0, tapRate: null, topButton: null, flag: "quiet", flagLabel: "Quiet, 7 days" },
  ],
  traffic: {
    counted: 18640,
    filtered: 783,
    reasons: [
      { label: "Crawlers and link previews", count: 512 },
      { label: "Tap without a signed page token", count: 190 },
      { label: "Repeats within 30 seconds", count: 81 },
    ],
  },
  unusual: [
    {
      shop: "Iron House Gym",
      detail:
        "A burst of scans in a few minutes from one group of devices. Held out of the monthly report until you decide.",
    },
  ],
  monthly: { text: "Sent on the 1st. Last run: 1 Oct, 41 of 42 delivered." },
};
