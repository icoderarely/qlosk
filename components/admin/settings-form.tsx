"use client";

import { useState, useTransition } from "react";
import { saveAllSettings } from "@/app/admin/settings/actions";
import { buttonClass, DownloadButton } from "./button";
import { Card, CardHeading } from "./card";
import { FieldRow, SelectField, TextField } from "./form-field";
import { LAYOUT_OPTIONS, THEME_OPTIONS } from "./look-options";
import { Switch } from "./switch";
import { LAYOUT_IDS, THEME_IDS, type LayoutId, type ThemeId } from "../shop-page/types";
import type { SettingsData, SuggestedLook } from "@/services/settings";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-t border-line-soft py-2.5">{children}</div>;
}

function ToggleRow({
  label,
  switchLabel,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  switchLabel: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Row>
      <span className="font-semibold">{label}</span>
      <Switch checked={checked} disabled={disabled} onChange={onChange} label={`${switchLabel} ${checked ? "on" : "off"}`} />
    </Row>
  );
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">{children}</div>;
}

// Themes and layouts, suggested looks, traffic filtering, and the QR address and
// WhatsApp number, saved together. `canEdit` is admin or owner; the QR address
// and WhatsApp number are the owner's alone (they are printed on every standee).
export function SettingsForm({
  settings,
  canEdit,
  isOwner,
}: {
  settings: SettingsData;
  canEdit: boolean;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [themes, setThemes] = useState(settings.enabledThemes);
  const [layouts, setLayouts] = useState(settings.enabledLayouts);
  const [filters, setFilters] = useState(Object.fromEntries(settings.filtering.map((f) => [f.id, f.enabled])));
  const [suggestions, setSuggestions] = useState<Record<string, SuggestedLook | null>>(
    Object.fromEntries(settings.shopTypes.map((t) => [t.label, t.suggested])),
  );
  const [domain, setDomain] = useState(settings.domain);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const enabledLayouts = LAYOUT_OPTIONS.filter((l) => layouts[l.id]);

  function setSuggestion(label: string, change: Partial<{ theme: ThemeId | ""; layout: LayoutId | "" }>) {
    setSuggestions((s) => {
      const now = s[label];
      const theme = change.theme !== undefined ? change.theme : (now?.theme ?? "");
      const layout = change.layout !== undefined ? change.layout : (now?.layout ?? "");
      if (theme === "") return { ...s, [label]: null };
      return { ...s, [label]: { theme, layout: layout || (enabledLayouts[0]?.id ?? "list") } };
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveAllSettings({
        themes,
        layouts,
        filtering: filters,
        suggestions,
        ...(isOwner ? { domain } : {}),
      });
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
    });
  }

  return (
    <>
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
                disabled={!canEdit}
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
                disabled={!canEdit}
                onChange={(on) => setLayouts((s: Record<LayoutId, boolean>) => ({ ...s, [l.id]: on }))}
              />
            ))}
          </div>
          <div className="min-w-0 flex-[1_1_320px]">
            <ColumnLabel>Suggested look by shop type</ColumnLabel>
            {settings.shopTypes.map((t) => {
              const look = suggestions[t.label];
              return (
                <Row key={t.label}>
                  <span className="font-semibold">{t.label}</span>
                  <div className="flex flex-wrap justify-end gap-2">
                    <SelectField
                      block
                      hideLabel
                      label={`Suggested theme for ${t.plural}`}
                      value={look?.theme ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => setSuggestion(t.label, { theme: e.target.value as ThemeId | "" })}
                    >
                      <option value="">No suggestion</option>
                      {THEME_IDS.filter((id) => themes[id] || look?.theme === id).map((id) => (
                        <option key={id} value={id}>
                          {THEME_OPTIONS.find((o) => o.id === id)?.name}
                        </option>
                      ))}
                    </SelectField>
                    {look ? (
                      <SelectField
                        block
                        hideLabel
                        label={`Suggested layout for ${t.plural}`}
                        value={look.layout}
                        disabled={!canEdit}
                        onChange={(e) => setSuggestion(t.label, { layout: e.target.value as LayoutId })}
                      >
                        {LAYOUT_IDS.filter((id) => layouts[id] || look.layout === id).map((id) => (
                          <option key={id} value={id}>
                            {LAYOUT_OPTIONS.find((o) => o.id === id)?.name}
                          </option>
                        ))}
                      </SelectField>
                    ) : null}
                  </div>
                </Row>
              );
            })}
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
              disabled={!canEdit}
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
            placeholder="https://yourdomain.in"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            readOnly={!isOwner}
            value={domain.qrBase}
            onChange={(e) => setDomain((d) => ({ ...d, qrBase: e.target.value }))}
          />
          <TextField
            label="WhatsApp number for customers"
            type="tel"
            placeholder="98200 12345"
            readOnly={!isOwner}
            value={domain.whatsappSender}
            onChange={(e) => setDomain((d) => ({ ...d, whatsappSender: e.target.value }))}
          />
        </FieldRow>
        <p className="m-0 text-[13px] text-muted">
          The QR address base is on every printed code. Keep this domain renewed for as long as any plan is active.
          Codes already printed keep their old address.{isOwner ? "" : " Only the owner can change these two."}
        </p>
        <p role="status" className={`m-0 min-h-5 text-[13px] font-semibold ${message?.ok === false ? "text-chip-over-fg" : "text-chip-live-fg"}`}>
          {message?.text}
        </p>
        {canEdit ? (
          <div className="flex flex-wrap gap-2.5 border-t border-line-soft pt-3.5">
            <DownloadButton href="/admin/settings/export">Export all shop data</DownloadButton>
            <button type="button" disabled={pending} onClick={save} className={buttonClass("primary")}>
              {pending ? "Saving…" : "Save settings"}
            </button>
          </div>
        ) : (
          <p className="m-0 border-t border-line-soft pt-3.5 text-[13px] text-muted">Only an admin can change settings.</p>
        )}
      </Card>
    </>
  );
}
