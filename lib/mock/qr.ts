// Fake QR code stock, from docs/design/AdminApp.dc.html.
export type QrStatus = "assigned" | "unassigned";

export type MockQrCode = {
  code: string;
  status: QrStatus;
  /** Shop name, or null for a code in stock. */
  shop: string | null;
  /** Tone of the status chip: Dr. Mehta is quiet, Brew & Bun is still a preview. */
  tone: "green" | "amber" | "blue" | "neutral";
  lastScan: string;
};

export const QR_COUNTS = { total: 120, assigned: 48, unassigned: 72, retired: 0 };

export const QR_CODES: MockQrCode[] = [
  { code: "7KX2M9", status: "assigned", shop: "Velvet Salon & Spa", tone: "green", lastScan: "12 minutes ago" },
  { code: "R4PD8T", status: "assigned", shop: "Kaveri Sweets", tone: "green", lastScan: "1 hour ago" },
  { code: "M2HC6W", status: "assigned", shop: "Iron House Gym", tone: "green", lastScan: "3 hours ago" },
  { code: "H8WQ5Z", status: "assigned", shop: "Dr. Mehta Dental", tone: "amber", lastScan: "9 days ago" },
  { code: "J9NV3B", status: "assigned", shop: "Brew & Bun Cafe", tone: "blue", lastScan: "Never" },
  { code: "W5RF4A", status: "unassigned", shop: null, tone: "neutral", lastScan: "Never" },
  { code: "T7QK2D", status: "unassigned", shop: null, tone: "neutral", lastScan: "Never" },
  { code: "Y3BN8H", status: "unassigned", shop: null, tone: "neutral", lastScan: "Never" },
];

export const STICKER_SIZES = ["4x6 card", "A5 standee", "Small sticker"] as const;
