import Link from "next/link";
import type { ComponentProps } from "react";
import { withDefaults, type Default } from "./cx";
import { Icon } from "./icon";

export type ButtonVariant = "secondary" | "primary" | "ghost" | "danger";

const BASE =
  "box-border inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border font-bold";

const DEFAULTS: Default[] = [
  [/\brounded-/, "rounded-[10px]"],
  [/\bpx-/, "px-4"],
];

const VARIANTS: Record<ButtonVariant, string> = {
  secondary: "border-field bg-white text-ink",
  primary: "border-accent bg-accent text-white",
  ghost: "border-transparent bg-transparent text-ink",
  danger: "border-danger-line bg-white text-chip-over-fg",
};

export function buttonClass(variant: ButtonVariant = "secondary", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${withDefaults(DEFAULTS, extra)}`;
}

type ButtonProps = Omit<ComponentProps<"button">, "type"> & {
  variant?: ButtonVariant;
  icon?: string;
  /** Icon after the label, such as the chevron on a dropdown-style button. */
  iconAfter?: string;
};

// Buttons whose action is not built yet render without a handler (each call
// site carries a TODO). type="button" keeps them from submitting a form.
export function Button({
  variant = "secondary",
  icon,
  iconAfter,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type="button" className={buttonClass(variant, className)} {...rest}>
      {icon ? <Icon d={icon} /> : null}
      {children}
      {iconAfter ? <Icon d={iconAfter} /> : null}
    </button>
  );
}

export function LinkButton({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; icon?: string }) {
  return (
    <Link className={buttonClass(variant, className)} {...rest}>
      {icon ? <Icon d={icon} /> : null}
      {children}
    </Link>
  );
}
