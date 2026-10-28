"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { STRINGS } from "./strings";

// Copies the address of the page it is on, without the query string. Nothing is
// sent anywhere. On the playground that is the playground link with the look.
export function ShareButton({ className }: { className: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = new URL(window.location.href);
    if (!url.pathname.startsWith("/qr/playground")) url.search = "";
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: nothing to do, the address bar still has the link.
    }
  }

  return (
    <button type="button" onClick={copy} aria-label={STRINGS.share} className={className}>
      <Icon name="share" size={20} />
      <span role="status" className="sr-only">
        {copied ? STRINGS.linkCopied : ""}
      </span>
      {copied ? (
        <span
          aria-hidden="true"
          className="absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-full bg-sp-chipbg px-3 py-1.5 text-[12px] font-bold text-sp-chiptext"
        >
          {STRINGS.linkCopied}
        </span>
      ) : null}
    </button>
  );
}
