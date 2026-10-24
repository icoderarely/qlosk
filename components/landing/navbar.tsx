"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { Ic } from "./parts";

const LINKS = [
  { href: "#how", label: "How it works", menu: "How it works" },
  { href: "#try", label: "Looks", menu: "Try a look" },
  { href: "#features", label: null, menu: "Features" },
  { href: "#pricing", label: "Pricing", menu: "Pricing" },
  { href: "#faq", label: "FAQ", menu: "FAQ" },
] as const;

// Full width at the top; the CSS in landing.css shrinks it as the page scrolls
// (scroll-driven animation, where supported). The only state is the mobile menu.
export function Navbar({ whatsappHref }: { whatsappHref: string }) {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      burger.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !burger.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="l-navwrap">
      <header className="l-navbar">
        <a href="#top" className="l-brand" aria-label={`${BRAND_NAME}, back to top`}>
          <span className="l-mark"><BrandMark className="size-5" /></span>
          <span className="l-serif l-brandname">{BRAND_NAME}</span>
        </a>
        <nav className="l-links" aria-label="Main">
          {LINKS.filter((l) => l.label).map((l) => (
            <a key={l.href} className="l-link" href={l.href}>{l.label}</a>
          ))}
        </nav>
        <div className="l-navend">
          <a className="l-go" href={whatsappHref}>Let&rsquo;s go</a>
          <button
            ref={burger}
            type="button"
            className="l-burger"
            aria-expanded={open}
            aria-controls="l-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <Ic d={open ? "close" : "menu"} />
          </button>
        </div>
      </header>
      {open ? (
        <nav id="l-menu" ref={menu} className="l-menu" aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.menu}</a>
          ))}
          <a className="l-btn l-btn-b" href={whatsappHref} onClick={() => setOpen(false)}>Message us on WhatsApp</a>
        </nav>
      ) : null}
    </div>
  );
}
