// Pill group for filters (status tabs, All / Assigned / Unassigned). Real
// buttons with aria-pressed, so the state is not colour only.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-seg p-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`min-h-11 cursor-pointer rounded-[9px] border-0 px-3.5 ${
              on ? "bg-white font-bold text-ink" : "bg-transparent font-semibold text-menu"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
