import { useEffect, useRef, useState } from "react";
import { Button } from "../button";
import { Card } from "../card";
import { TextField } from "../form-field";
import { Icon } from "../icon";
import { LINK_ICONS, LINK_TYPE_LABELS } from "../icons";
import { Switch } from "../switch";
import { DERIVED_LINK_TYPES, LINK_TYPES, moveItem } from "@/services/links";
import { newLink } from "@/services/shop-editor";
import type { TabProps } from "./state";

const DERIVED_NOTE: Record<string, string> = {
  call: "Set from the phone number in Details.",
  whatsapp: "Set from the WhatsApp number in Details.",
  wifi: "Shows the Wi-Fi details from the Offers and Wi-Fi tab.",
};

export function ButtonsTab({ state, set }: TabProps) {
  const [editing, setEditing] = useState<string | null>(null);
  // After a move the row re-renders in a new place; put focus back on the arrow
  // that was used so keyboard users can keep going.
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    if (!refocus.current) return;
    document.querySelector<HTMLElement>(`[data-move="${refocus.current}"]`)?.focus();
    refocus.current = null;
  });

  const update = (id: string, patch: Partial<(typeof state.links)[number]>) =>
    set("links", state.links.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  function move(index: number, to: number, key: string) {
    refocus.current = key;
    set("links", moveItem(state.links, index, to));
  }

  function add(type: (typeof LINK_TYPES)[number]) {
    const link = newLink(type);
    set("links", [...state.links, link]);
    setEditing(link.id);
  }

  function remove(id: string) {
    set("links", state.links.filter((l) => l.id !== id));
    setEditing(null);
  }

  return (
    <Card>
      <div className="mb-2">
        <h2 className="m-0 text-base font-extrabold">Page buttons</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Use the arrows to reorder. The WhatsApp button is the big one at the top, or Call when
          there is no WhatsApp button.
        </p>
      </div>

      <ul className="m-0 list-none p-0">
        {state.links.map((l, i) => {
          const derived = DERIVED_LINK_TYPES.includes(l.type);
          const open = editing === l.id;
          return (
            <li key={l.id} className="border-t border-line-soft py-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-none">
                  <button
                    type="button"
                    data-move={`${l.id}-up`}
                    aria-label={`Move ${l.label} up`}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1, `${l.id}-up`)}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-menu disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Arrow up />
                  </button>
                  <button
                    type="button"
                    data-move={`${l.id}-down`}
                    aria-label={`Move ${l.label} down`}
                    disabled={i === state.links.length - 1}
                    onClick={() => move(i, i + 1, `${l.id}-down`)}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-menu disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Arrow />
                  </button>
                </div>
                <span className="flex size-[38px] flex-none items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_12%,white)] text-accent">
                  <Icon d={LINK_ICONS[l.type]} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{l.label}</div>
                  <div className="truncate text-[13px] text-muted">
                    {LINK_TYPE_LABELS[l.type]} ·{" "}
                    {derived ? DERIVED_NOTE[l.type] : l.target || "No link yet"}
                  </div>
                </div>
                <Switch
                  checked={l.enabled}
                  onChange={(enabled) => update(l.id, { enabled })}
                  label={`${l.label} is ${l.enabled ? "on" : "off"}`}
                />
                <Button
                  aria-label={`${open ? "Close" : "Edit"} ${l.label}`}
                  aria-expanded={open}
                  onClick={() => setEditing(open ? null : l.id)}
                >
                  {open ? "Done" : "Edit"}
                </Button>
              </div>

              {open ? (
                <div className="mt-3 flex flex-col gap-3 pl-0 sm:pl-[68px]">
                  <TextField
                    block
                    label="Button name"
                    maxLength={40}
                    value={l.label}
                    onChange={(e) => update(l.id, { label: e.target.value })}
                  />
                  {derived ? (
                    <p className="m-0 text-[13px] text-muted">{DERIVED_NOTE[l.type]}</p>
                  ) : (
                    <TextField
                      block
                      label={l.type === "instagram" ? "Instagram handle or link" : "Link"}
                      placeholder={l.type === "instagram" ? "@handle" : "https://"}
                      value={l.target}
                      onChange={(e) => update(l.id, { target: e.target.value })}
                    />
                  )}
                  <div>
                    <Button variant="danger" onClick={() => remove(l.id)}>
                      Remove this button
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-1 border-t border-line-soft pt-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
          Add a button
        </div>
        <div className="flex flex-wrap gap-2">
          {LINK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={state.links.length >= 20}
              onClick={() => add(type)}
              className="min-h-11 cursor-pointer rounded-full border-0 bg-chip-none-bg px-4 text-xs font-bold text-chip-none-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {LINK_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
    </svg>
  );
}
