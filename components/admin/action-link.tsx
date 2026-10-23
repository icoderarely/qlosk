import Link from "next/link";
import { buttonClass, type ButtonVariant } from "./button";

// A button-looking link. An external link (WhatsApp) opens in a new tab and says so.
export function ActionLink({
  href,
  external,
  variant = "secondary",
  className = "",
  children,
  label,
}: {
  href: string;
  external: boolean;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
  /** Longer name for screen readers, such as "Nudge: Brew & Bun Cafe". */
  label?: string;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label ? `${label} (opens in a new tab)` : undefined} className={buttonClass(variant, className)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-label={label} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
