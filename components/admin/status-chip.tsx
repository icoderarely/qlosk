import type { PaymentStatus, ShopStatus } from "@/services/shops";
import { Chip, type ChipTone } from "./chip";

const SHOP_STATUS: Record<ShopStatus, { label: string; tone: ChipTone }> = {
  live: { label: "Live", tone: "green" },
  quiet: { label: "Quiet", tone: "amber" },
  preview: { label: "Preview sent", tone: "blue" },
  printing: { label: "Printing", tone: "amber" },
  building: { label: "Building", tone: "neutral" },
  expired: { label: "Expired", tone: "red" },
};

const PAYMENT: Record<PaymentStatus, { label: string; tone: ChipTone }> = {
  paid: { label: "Paid", tone: "green" },
  due_soon: { label: "Due soon", tone: "amber" },
  overdue: { label: "Overdue", tone: "red" },
  not_started: { label: "Not started", tone: "neutral" },
};

export function statusLabel(status: ShopStatus): string {
  return SHOP_STATUS[status].label;
}

export function StatusChip({ status }: { status: ShopStatus }) {
  const s = SHOP_STATUS[status];
  return <Chip tone={s.tone}>{s.label}</Chip>;
}

export function PaymentChip({ status }: { status: PaymentStatus }) {
  const p = PAYMENT[status];
  return <Chip tone={p.tone}>{p.label}</Chip>;
}
