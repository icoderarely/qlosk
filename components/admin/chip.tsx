export type ChipTone = "green" | "amber" | "red" | "blue" | "neutral";

const TONES: Record<ChipTone, string> = {
  green: "bg-chip-live-bg text-chip-live-fg",
  amber: "bg-chip-wait-bg text-chip-wait-fg",
  red: "bg-chip-over-bg text-chip-over-fg",
  blue: "bg-chip-prev-bg text-chip-prev-fg",
  neutral: "bg-chip-none-bg text-chip-none-fg",
};

// The label always carries the meaning; colour only backs it up.
export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: ChipTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-bold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
