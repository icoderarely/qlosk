"use client";

import { useState } from "react";
import { Button } from "./button";
import { Card, CardHeading } from "./card";
import { Chip, type ChipTone } from "./chip";
import { FieldRow, TextField } from "./form-field";
import { ICON_PLUS } from "./icons";
import { LAYOUT_OPTIONS, THEME_OPTIONS, lookLabel } from "./look-options";
import { PageHeader } from "./page-header";
import { Switch } from "./switch";
import type { LayoutId, ThemeId } from "../shop-page/types";
import type { SettingsData } from "@/services/settings";

const ROLE: Record<SettingsData["accounts"][number]["role"], { label: string; tone: ChipTone }> = {
  owner: { label: "Owner", tone: "green" },
  admin: { label: "Admin", tone: "blue" },
  viewer: { label: "Viewer", tone: "neutral" },
};

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line-soft py-2.5">
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  switchLabel,
  checked,
  onChange,
}: {
  label: string;
  switchLabel: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Row>
      <span className="font-semibold">{label}</span>
      <Switch
        checked={checked}
        onChange={onChange}
        label={`${switchLabel} ${checked ? "on" : "off"}`}
      />
    </Row>
  );
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">{children}</div>
  );
}

// Settings page body. Switches and fields hold local state; nothing is saved
// until slice 9.
export function SettingsForm({ settings }: { settings: SettingsData }) {
  const [themes, setThemes] = useState(settings.enabledThemes);
  const [layouts, setLayouts] = useState(settings.enabledLayouts);
  const [filters, setFilters] = useState(
    Object.fromEntries(settings.filtering.map((f) => [f.id, f.enabled])),
  );
  const [domain, setDomain] = useState(settings.domain);

  const suggested = settings.shopTypes.filter((t) => t.suggested);

  return (
    <>
      <PageHeader title="Settings" subtitle="Team access, defaults and how traffic is counted." />

      <Card className="flex flex-col gap-2 p-5">
        <CardHeading
          title="Team accounts"
          description="Accounts that can sign in. Only the owner can add or remove them."
          action={
            // TODO(slice 9): add, change and remove accounts (owner only)
            <Button icon={ICON_PLUS}>Add account</Button>
          }
        />
        <ul className="m-0 mt-1 list-none p-0">
          {settings.accounts.map((a) => (
            <li key={a.username}>
              <Row>
                <span className="font-semibold">{a.username}</span>
                <Chip tone={ROLE[a.role].tone}>{ROLE[a.role].label}</Chip>
              </Row>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-2 p-5">
        <CardHeading
          title="Themes and layouts"
          description="Turn options on or off for new shops. Existing shops keep what they have."
        />
        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-0 flex-[1_1_240px]">
            <ColumnLabel>Themes</ColumnLabel>
            {THEME_OPTIONS.map((t) => (
              <ToggleRow
                key={t.id}
                label={t.name}
                switchLabel={t.name}
                checked={themes[t.id]}
                onChange={(on) => setThemes((s: Record<ThemeId, boolean>) => ({ ...s, [t.id]: on }))}
              />
            ))}
          </div>
          <div className="min-w-0 flex-[1_1_240px]">
            <ColumnLabel>Layouts</ColumnLabel>
            {LAYOUT_OPTIONS.map((l) => (
              <ToggleRow
                key={l.id}
                label={l.name}
                switchLabel={l.name}
                checked={layouts[l.id]}
                onChange={(on) =>
                  setLayouts((s: Record<LayoutId, boolean>) => ({ ...s, [l.id]: on }))
                }
              />
            ))}
          </div>
          <div className="min-w-0 flex-[1_1_280px]">
            <ColumnLabel>Suggested look by shop type</ColumnLabel>
            {/* TODO(slice 9): edit the suggested look per shop type */}
            {suggested.map((t) => (
              <Row key={t.label}>
                <span className="font-semibold">{t.label}</span>
                <Chip>{t.suggested ? lookLabel(t.suggested.theme, t.suggested.layout) : ""}</Chip>
              </Row>
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-5">
        <CardHeading title="Traffic filtering" description="Flagged requests are kept, not deleted." />
        <div>
          {settings.filtering.map((f) => (
            <ToggleRow
              key={f.id}
              label={f.label}
              switchLabel={f.switchLabel}
              checked={filters[f.id]}
              onChange={(on) => setFilters((s) => ({ ...s, [f.id]: on }))}
            />
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3.5 p-5">
        <CardHeading title="Domain and WhatsApp" />
        <FieldRow>
          <TextField
            label="QR address base"
            placeholder="[yourdomain.in]"
            value={domain.qrBase}
            onChange={(e) => setDomain((d) => ({ ...d, qrBase: e.target.value }))}
          />
          <TextField
            label="WhatsApp sender number"
            type="tel"
            placeholder="[business number]"
            value={domain.whatsappSender}
            onChange={(e) => setDomain((d) => ({ ...d, whatsappSender: e.target.value }))}
          />
        </FieldRow>
        <p className="m-0 text-[13px] text-muted">
          The QR address base is on every printed code. Keep this domain renewed for as long as any
          plan is active.
        </p>
        {/* TODO(slice 9): export all shop data; save settings */}
        <div className="flex flex-wrap gap-2.5 border-t border-line-soft pt-3.5">
          <Button>Export all shop data</Button>
          <Button variant="primary">Save settings</Button>
        </div>
      </Card>
    </>
  );
}
