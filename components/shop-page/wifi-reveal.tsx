"use client";

import { useId, useState } from "react";
import { STRINGS } from "./strings";
import type { WifiInfo } from "./types";

// The Wi-Fi row is a real button that reveals the network and password under
// it. `trigger` is the row content, drawn by the layout so each layout keeps
// its own look. The three className props carry that look.
export function WifiReveal({
  wifi,
  trigger,
  wrapperClassName,
  buttonClassName,
  panelClassName,
}: {
  wifi: WifiInfo;
  trigger: React.ReactNode;
  wrapperClassName: string;
  buttonClassName: string;
  panelClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelId = useId();

  async function copy() {
    try {
      await navigator.clipboard.writeText(wifi.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the password is visible to read out.
    }
  }

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        className={buttonClassName}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={`flex flex-col gap-1.5 rounded-xl border border-sp-line bg-sp-bg p-3 text-left text-[14px] text-sp-text ${panelClassName}`}
      >
        <div>
          <span className="text-[12px] text-sp-muted">
            {STRINGS.wifiNetwork}
          </span>
          <div className="font-semibold">{wifi.network}</div>
        </div>
        <div>
          <span className="text-[12px] text-sp-muted">
            {STRINGS.wifiPassword}
          </span>
          <div className="font-semibold">{wifi.password}</div>
        </div>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-xl border border-sp-iconfg bg-sp-card px-3 text-[14px] font-bold text-sp-text"
        >
          {copied ? STRINGS.copied : STRINGS.wifiCopy}
        </button>
      </div>
    </div>
  );
}
