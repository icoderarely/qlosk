// Fake onboarding board, from docs/design/AdminApp.dc.html.
export type CardTone = "neutral" | "amber" | "blue" | "red" | "green";

export type OnboardingCard = {
  name: string;
  sub: string;
  tag: string;
  tone: CardTone;
  action: string;
  /** The one next step worth highlighting, drawn as a primary button. */
  primary?: boolean;
};

export type OnboardingColumn = {
  title: string;
  hint: string;
  cards: OnboardingCard[];
};

export const ONBOARDING_TODAY = [
  "Send preview to Glow Skin Clinic",
  "Follow up with Brew & Bun Cafe",
  "Ship Aarav Jewellers standee",
];

export const ONBOARDING_COLUMNS: OnboardingColumn[] = [
  {
    title: "Lead",
    hint: "Collect name, logo and links",
    cards: [
      { name: "Sharma Opticals", sub: "Optician · met in person", tag: "21 Oct", tone: "neutral", action: "Collect details" },
      { name: "Lotus Yoga Studio", sub: "Fitness · WhatsApp enquiry", tag: "Yesterday", tone: "neutral", action: "Reply" },
      { name: "Patel Pharmacy", sub: "Pharmacy · asked for price", tag: "Today", tone: "neutral", action: "Send plans" },
    ],
  },
  {
    title: "Building",
    hint: "Theme, buttons, offers",
    cards: [
      { name: "Spice Route Restaurant", sub: "Restaurant · Yearly", tag: "Waiting for logo", tone: "amber", action: "Request logo" },
      { name: "Glow Skin Clinic", sub: "Skin clinic · Monthly", tag: "Ready to preview", tone: "blue", action: "Send preview", primary: true },
    ],
  },
  {
    title: "Preview sent",
    hint: "Waiting for approval and payment",
    cards: [
      { name: "Brew & Bun Cafe", sub: "Cafe · Yearly", tag: "Sent 2 days ago", tone: "amber", action: "Nudge on WhatsApp" },
      { name: "Urban Cuts", sub: "Salon · Yearly", tag: "Sent today", tone: "neutral", action: "Open preview" },
      { name: "Green Leaf Bakery", sub: "Bakery · Monthly", tag: "Sent 6 days ago", tone: "red", action: "Call owner" },
    ],
  },
  {
    title: "Printing",
    hint: "Approved, paid, standee in progress",
    cards: [
      { name: "Aarav Jewellers", sub: "Jewellery · Yearly", tag: "Printed, ready to ship", tone: "green", action: "Mark shipped", primary: true },
    ],
  },
  {
    title: "Live this week",
    hint: "First scans and the first report",
    cards: [
      { name: "Kiran Interiors", sub: "Interior designer · Yearly", tag: "Live 2 days ago", tone: "green", action: "Open shop" },
      { name: "Fresh Basket Grocers", sub: "Grocery · Monthly", tag: "No scans yet", tone: "amber", action: "Check placement" },
    ],
  },
];
