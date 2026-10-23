"use client";

import { useRef } from "react";

export function tabDomId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`;
}
export function panelDomId(prefix: string, id: string): string {
  return `${prefix}-panel-${id}`;
}

// WAI-ARIA tabs: one tab stop, arrow keys move between tabs. The caller renders
// the panel with role="tabpanel", id={panelDomId(...)} and
// aria-labelledby={tabDomId(...)}.
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-1 border-b border-line"
    >
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={tabDomId(idPrefix, t.id)}
            aria-selected={on}
            aria-controls={panelDomId(idPrefix, t.id)}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-11 cursor-pointer border-0 border-b-[3px] bg-transparent px-3.5 ${
              on
                ? "border-accent font-extrabold text-ink"
                : "border-transparent font-semibold text-menu"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
