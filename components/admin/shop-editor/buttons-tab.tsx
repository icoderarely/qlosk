import { Button } from "../button";
import { Card } from "../card";
import { Icon } from "../icon";
import {
  ICON_GRIP,
  ICON_PLUS,
  LINK_ICONS,
  LINK_TYPE_LABELS,
} from "../icons";
import { Switch } from "../switch";
import { ADDABLE_LINK_LABELS } from "@/lib/mock/links";
import type { TabProps } from "./state";

export function ButtonsTab({ state, set }: TabProps) {
  function toggle(id: string, enabled: boolean) {
    set(
      "links",
      state.links.map((l) => (l.id === id ? { ...l, enabled } : l)),
    );
  }

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-extrabold">Page buttons</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Drag to reorder. The first one is the main button.
          </p>
        </div>
        {/* TODO(slice 4): add a button row; drag to reorder */}
        <Button variant="primary" icon={ICON_PLUS}>
          Add button
        </Button>
      </div>

      <ul className="m-0 list-none p-0">
        {state.links.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-3 border-t border-line-soft py-3"
          >
            <span className="text-[#8a90a0]">
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={ICON_GRIP} />
              </svg>
            </span>
            <span className="flex size-[38px] flex-none items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_12%,white)] text-accent">
              <Icon d={LINK_ICONS[l.type]} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{l.label}</div>
              <div className="text-[13px] text-muted">
                {LINK_TYPE_LABELS[l.type]} · {l.target}
              </div>
            </div>
            <Switch
              checked={l.enabled}
              onChange={(next) => toggle(l.id, next)}
              label={`${l.label} is ${l.enabled ? "on" : "off"}`}
            />
            {/* TODO(slice 4): edit a button's label and target */}
            <Button aria-label={`Edit ${l.label}`}>Edit</Button>
          </li>
        ))}
      </ul>

      <div className="mt-1 border-t border-line-soft pt-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
          Add another
        </div>
        <div className="flex flex-wrap gap-2">
          {/* TODO(slice 4): add a button of this type */}
          {ADDABLE_LINK_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className="min-h-11 cursor-pointer rounded-full border-0 bg-chip-none-bg px-4 text-xs font-bold text-chip-none-fg"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
