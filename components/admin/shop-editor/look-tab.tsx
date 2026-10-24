import { checkButtonColor, contrastReason } from "@/services/look";
import { Button } from "../button";
import { Card, CardHeading } from "../card";
import { Chip } from "../chip";
import { FONT_PACKS } from "../../shop-page/fonts";
import type { FontId, LayoutId, ThemeId } from "../../shop-page/types";
import {
  BUTTON_COLORS,
  FONT_OPTIONS,
  LANGUAGE_OPTIONS,
  LAYOUT_OPTIONS,
  THEME_OPTIONS,
  themeName,
  themeSwatch,
} from "../look-options";
import { OptionCard, OptionGrid } from "../option-card";
import type { ShopTypeOption } from "@/services/settings";
import type { TabProps } from "./state";

const SECTION = "flex flex-col gap-3.5 p-5";

const colorAllowed = (theme: ThemeId, hex: string) => checkButtonColor(theme, hex).ok;

export function LookTab({
  state,
  set,
  suggestion,
  enabledThemes,
  enabledLayouts,
}: TabProps & {
  suggestion: ShopTypeOption | null;
  /** From Settings. A look a shop already uses stays visible even if turned off. */
  enabledThemes: ThemeId[];
  enabledLayouts: LayoutId[];
}) {
  const { look, buttonColor, language } = state;
  const suggested = suggestion?.suggested ?? null;

  function pickTheme(theme: ThemeId) {
    set("look", { ...look, theme });
    // The editor blocks an override that fails contrast, so drop one that the
    // new theme would make unreadable.
    if (buttonColor && !colorAllowed(theme, buttonColor)) set("buttonColor", null);
  }
  const pickLayout = (layout: LayoutId) => set("look", { ...look, layout });
  const pickFont = (font: FontId) => set("look", { ...look, font });

  const blocked = BUTTON_COLORS.map((c) => ({ ...c, check: checkButtonColor(look.theme, c.hex) })).filter(
    (c) => !c.check.ok,
  );

  return (
    <>
      <Card className={SECTION}>
        <CardHeading
          title="Theme"
          description="Colors and button style."
          action={
            suggestion?.suggested ? (
              <Chip tone="green">Suggested for {suggestion.plural}</Chip>
            ) : undefined
          }
        />
        <OptionGrid row>
          {THEME_OPTIONS.filter((t) => enabledThemes.includes(t.id) || t.id === look.theme).map((t) => {
            const sw = themeSwatch(t.id);
            return (
              <OptionCard key={t.id} pressed={look.theme === t.id} onClick={() => pickTheme(t.id)}>
                <div
                  className="flex flex-col gap-1.5 rounded-lg border border-line p-2.5"
                  style={{ background: sw.bg }}
                >
                  <div className="h-3 rounded-md" style={{ background: sw.btn }} />
                  <div
                    className="h-2 rounded"
                    style={{ background: sw.card, border: `1px solid ${sw.line}` }}
                  />
                  <div
                    className="h-2 rounded"
                    style={{ background: sw.card, border: `1px solid ${sw.line}` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-extrabold">{t.name}</span>
                  {suggested?.theme === t.id ? <Chip tone="green">Suggested</Chip> : null}
                </div>
                <div className="-mt-1.5 text-xs text-muted">{t.note}</div>
              </OptionCard>
            );
          })}
        </OptionGrid>
      </Card>

      <Card className={SECTION}>
        <CardHeading title="Layout" description="How the buttons are arranged." />
        <OptionGrid row>
          {LAYOUT_OPTIONS.filter((l) => enabledLayouts.includes(l.id) || l.id === look.layout).map((l) => (
            <OptionCard key={l.id} pressed={look.layout === l.id} onClick={() => pickLayout(l.id)}>
              <svg
                viewBox="0 0 64 44"
                aria-hidden="true"
                className="block h-auto w-full rounded-lg bg-ground"
              >
                <path d={l.d2} fill="#C9CED8" />
                <path d={l.d1} className="fill-accent" />
              </svg>
              <div className="font-extrabold">{l.name}</div>
              <div className="-mt-1.5 text-xs text-muted">{l.note}</div>
            </OptionCard>
          ))}
        </OptionGrid>
      </Card>

      <Card className={SECTION}>
        <CardHeading title="Font" description="Used for the shop name and headings." />
        <OptionGrid min={160}>
          {FONT_OPTIONS.map((f) => {
            const pack = FONT_PACKS[f.id];
            return (
              <OptionCard key={f.id} pressed={look.font === f.id} onClick={() => pickFont(f.id)}>
                <div className={pack.className}>
                  <div
                    aria-hidden="true"
                    className="text-[30px] leading-[1.45]"
                    style={{ fontFamily: pack.head, fontWeight: f.id === "rounded" ? 800 : 700 }}
                  >
                    Aa Gg
                  </div>
                </div>
                <div className="font-extrabold">{f.name}</div>
                <div className="-mt-1.5 text-xs text-muted">{f.note}</div>
              </OptionCard>
            );
          })}
        </OptionGrid>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <CardHeading
          title="Small tweaks"
          description="Only these can be changed per shop, so every page stays consistent."
        />
        <div>
          <div className="mb-1.5 text-[13px] font-bold" id="btn-color-label">
            Button color
          </div>
          <div role="group" aria-labelledby="btn-color-label" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-pressed={buttonColor === null}
              onClick={() => set("buttonColor", null)}
              className={`min-h-11 cursor-pointer rounded-full border-2 px-4 text-xs font-bold text-chip-none-fg ${
                buttonColor === null ? "border-accent bg-chip-none-bg" : "border-transparent bg-chip-none-bg"
              }`}
            >
              Theme default
            </button>
            {BUTTON_COLORS.map((c) => {
              const ok = colorAllowed(look.theme, c.hex);
              const on = buttonColor === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  aria-pressed={on}
                  aria-label={ok ? c.name : `${c.name}, not available on ${themeName(look.theme)}`}
                  disabled={!ok}
                  onClick={() => set("buttonColor", c.hex)}
                  className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span
                    className={`block size-8 rounded-full ${on ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
                    style={{ background: c.hex }}
                  />
                </button>
              );
            })}
          </div>
          {blocked.length > 0 ? (
            <ul className="mt-1 mb-0 list-none p-0 text-[13px] text-muted">
              {blocked.map((c) => (
                <li key={c.hex}>
                  {c.name} can&apos;t be used on {themeName(look.theme)}: the {contrastReason(c.check)}.
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-bold" id="lang-label">
            Page language
          </div>
          <div role="group" aria-labelledby="lang-label" className="flex flex-wrap gap-2.5">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={language === lang}
                onClick={() => set("language", lang)}
                className={`min-h-11 cursor-pointer rounded-full border-2 px-4 text-xs font-bold ${
                  language === lang
                    ? "border-accent bg-chip-live-bg text-chip-live-fg"
                    : "border-transparent bg-chip-none-bg text-chip-none-fg"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-soft pt-3.5">
          <Button
            disabled={!suggested}
            className="disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (!suggested) return;
              set("look", { ...look, theme: suggested.theme, layout: suggested.layout });
              if (buttonColor && !colorAllowed(suggested.theme, buttonColor)) set("buttonColor", null);
            }}
          >
            Reset to suggested look
          </Button>
        </div>
      </Card>
    </>
  );
}
