"use client";

import { useState } from "react";
import { STRINGS } from "./strings";

// The one place a visitor copies something. It only writes to the clipboard;
// nothing is sent anywhere.
export function CopyCode({
  code,
  className,
  children,
  label,
}: {
  code: string;
  className: string;
  /** Visible content. Defaults to the code itself. */
  children?: React.ReactNode;
  /** Accessible name when the visible text is only the code. */
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code stays visible on the button to read out.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={className}
      aria-label={label ? `${label}: ${code}` : undefined}
    >
      {copied ? STRINGS.copied : (children ?? code)}
      <span role="status" className="sr-only">
        {copied ? STRINGS.copied : ""}
      </span>
    </button>
  );
}
