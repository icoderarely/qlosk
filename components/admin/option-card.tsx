import { Icon } from "./icon";

// A pickable card (theme, layout, font): a real button with aria-pressed. The
// check mark backs up the border colour.
export function OptionCard({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`relative box-border flex cursor-pointer flex-col gap-2 rounded-[14px] border-2 bg-white p-2.5 text-left text-ink ${
        pressed ? "border-accent" : "border-line"
      }`}
    >
      {children}
      {pressed ? (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 flex size-[22px] items-center justify-center rounded-full bg-accent text-white"
        >
          <Icon d="M5 12l5 5 9-10" size={14} />
        </span>
      ) : null}
    </button>
  );
}

export function OptionGrid({
  min = 150,
  row = false,
  children,
}: {
  min?: number;
  /** One line that scrolls sideways instead of wrapping onto more rows. */
  row?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={row ? "grid auto-cols-[minmax(150px,1fr)] grid-flow-col gap-3 overflow-x-auto p-0.5" : "grid gap-3"}
      style={row ? undefined : { gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}
    >
      {children}
    </div>
  );
}
