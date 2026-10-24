// English UI copy from docs/design/ShopPage.dc.html. Page language (Hindi,
// Marathi) is a later per-shop override; it will swap this table.
export const STRINGS = {
  primaryHint: "Opens WhatsApp",
  moreWays: "More ways to reach us",
  everythingElse: "Everything else",
  offerBadge: "Offer",
  offerDefaultNote: "Show this page at the desk",
  copyCode: "Tap to copy",
  copied: "Copied",
  wifiChip: "Tap to show",
  wifiNetwork: "Network",
  wifiPassword: "Password",
  wifiCopy: "Copy password",
  coverPlaceholder: "Cover photo goes here",
  logoAlt: "Shop logo placeholder",
  chatWelcome: (name: string) =>
    `Hi, welcome to ${name}. How can we help you today?`,
  poweredBy: "Powered by",
  getYourOwn: "Get your own page",
  share: "Copy link to this page",
  linkCopied: "Link copied",
  viewOnMobile: "View on mobile",
} as const;

// The chat layout writes the offer note as a sentence.
export function asSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
