import { Card } from "./card";

export type StatTone = "up" | "warn" | "mut";

const NOTE: Record<StatTone, string> = {
  up: "text-chip-live-fg",
  warn: "text-chip-wait-fg",
  mut: "text-muted",
};

// A KPI card: label, big number and an optional note.
export function StatCard({
  label,
  value,
  note,
  tone = "mut",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: StatTone;
}) {
  return (
    <Card className="flex-[1_1_200px] p-5">
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <div className="mt-1 text-[32px] font-extrabold tracking-[-0.02em]">{value}</div>
      {note ? <div className={`text-[13px] font-semibold ${NOTE[tone]}`}>{note}</div> : null}
    </Card>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-4">{children}</div>;
}
