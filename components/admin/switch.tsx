// A real button with role="switch". The button is 44px wide and tall for the
// touch target; the visible track inside is the design's 44 x 26.
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Names the control for screen readers, e.g. "Offer on". */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0"
    >
      <span
        aria-hidden="true"
        className={`relative block h-[26px] w-11 rounded-full ${checked ? "bg-accent" : "bg-switch-off"}`}
      >
        <span
          className={`absolute top-[3px] size-5 rounded-full bg-white ${checked ? "left-[21px]" : "left-[3px]"}`}
        />
      </span>
    </button>
  );
}
