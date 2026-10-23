import { useId } from "react";
import { withDefaults, type Default } from "./cx";
import type { ComponentProps } from "react";

const INPUT =
  "box-border rounded-[10px] border border-field bg-white text-ink placeholder:text-muted";

const INPUT_DEFAULTS: Default[] = [
  [/\bmin-h-/, "min-h-11"],
  [/\bw-/, "w-full"],
  [/\bpl-/, "pl-3"],
  [/\bpr-/, "pr-3"],
];

function inputClass(extra: string): string {
  return `${INPUT} ${withDefaults(INPUT_DEFAULTS, extra)}`;
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-4">{children}</div>;
}

// Label above a control. `block` drops the flex-grow so a single field in a
// column does not stretch vertically.
function Wrap({
  label,
  hideLabel,
  block,
  id,
  children,
}: {
  label: string;
  hideLabel?: boolean;
  block?: boolean;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className={block ? "min-w-0" : "min-w-0 flex-[1_1_240px]"}>
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "mb-1.5 block text-[13px] font-bold"}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

type Common = { label: string; hideLabel?: boolean; block?: boolean };

export function TextField({
  label,
  hideLabel,
  block,
  className = "",
  ...rest
}: Common & ComponentProps<"input">) {
  const id = useId();
  return (
    <Wrap label={label} hideLabel={hideLabel} block={block} id={id}>
      <input id={id} className={inputClass(className)} {...rest} />
    </Wrap>
  );
}

export function TextareaField({
  label,
  hideLabel,
  block,
  className = "",
  ...rest
}: Common & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <Wrap label={label} hideLabel={hideLabel} block={block} id={id}>
      <textarea
        id={id}
        className={inputClass(`min-h-[88px] resize-y py-2.5 ${className}`)}
        {...rest}
      />
    </Wrap>
  );
}

export function SelectField({
  label,
  hideLabel,
  block,
  className = "",
  children,
  ...rest
}: Common & ComponentProps<"select">) {
  const id = useId();
  return (
    <Wrap label={label} hideLabel={hideLabel} block={block} id={id}>
      <select id={id} className={inputClass(className)} {...rest}>
        {children}
      </select>
    </Wrap>
  );
}
