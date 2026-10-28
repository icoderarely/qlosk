import { useEffect, useState } from "react";
import { checkStandee } from "@/app/qr/admin/shops/standee-actions";
import { standeeContent } from "@/services/standee";
import type { QrArt } from "@/services/qr-art";
import { StandeePreview } from "../../standee/standee-preview";
import {
  DESIGN_INFO,
  SIZE_MM,
  STANDEE_DESIGNS,
  STANDEE_LIGHT_THEMES,
  STANDEE_MAX_HEADLINE,
  THEME_LABEL,
  canvasHeight,
  CANVAS_W,
  resolveStandeeTheme,
  type StandeeChoices,
  type StandeeDesign,
  type StandeeSize,
  type StandeeThemeChoice,
} from "../../standee/types";
import { THEMES } from "../../shop-page/themes";
import { Button, DownloadButton } from "../button";
import { Card, CardHeading } from "../card";
import { Chip } from "../chip";
import { FieldRow, SelectField, TextField } from "../form-field";
import { Icon } from "../icon";
import { ICON_DOWNLOAD } from "../icons";
import { OptionCard, OptionGrid } from "../option-card";
import type { TabProps } from "./state";

const SECTION = "flex flex-col gap-3.5 p-5";

/** What the server knows about this shop's QR: the drawn code, or why there is none. */
export type StandeeQr = {
  art: QrArt | null;
  /** The same code as a standalone SVG, for the QR and plan tab. */
  svg: string | null;
  /** The shop's assigned code; null while it has none (the preview then shows a sample code). */
  code: string | null;
  /** Why no code can be drawn, such as a missing QR address. */
  problem: string | null;
};

// Wireframes on a 64 x 90 grid: d1 is the highlighted part, d2 the rest (from the design).
const WIREFRAMES: Record<StandeeDesign, { d1: string; d2: string }> = {
  arch: { d1: "M22 40h20v20H22z", d2: "M8 84V30a24 24 0 0 1 48 0v54z M26 66h12v2H26z M24 72h16v2H24z" },
  ticket: { d1: "M10 52h24v24H10z", d2: "M6 6h52v78H6z M12 14h30v5H12z M12 24h40v8H12z M8 42h48v1H8z M38 54h16v3H38z M38 62h16v3H38z M38 70h16v3H38z" },
  badge: { d1: "M22 30h20v20H22z", d2: "M4 2h56v10H4z M6 40a26 26 0 1 0 52 0a26 26 0 1 0 -52 0z M20 76h24v4H20z" },
};

export function StandeeTab({
  state,
  choices,
  setChoices,
  code,
  dirty,
  saving,
  onSave,
  canEdit,
}: TabProps & {
  choices: StandeeChoices;
  setChoices: (next: StandeeChoices) => void;
  code: string | null;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  canEdit: boolean;
}) {
  const pageTheme = state.look.theme;
  const pick = <K extends keyof StandeeChoices>(key: K, value: StandeeChoices[K]) => setChoices({ ...choices, [key]: value });
  const matched = resolveStandeeTheme("match", pageTheme);

  return (
    <>
      <Card className={SECTION}>
        <CardHeading
          title="Standee design"
          description="The printed stand for this shop. Pick a layout and the preview updates."
          action={code ? <Chip tone="green">Code {code}</Chip> : <Chip tone="neutral">No code yet</Chip>}
        />
        <OptionGrid>
          {STANDEE_DESIGNS.map((d) => (
            <OptionCard key={d} pressed={choices.design === d} onClick={() => pick("design", d)}>
              <svg viewBox="0 0 64 90" aria-hidden="true" className="block h-auto w-full rounded-lg bg-ground">
                <path d={WIREFRAMES[d].d2} fill="#C9CED8" />
                <path d={WIREFRAMES[d].d1} className="fill-accent" />
              </svg>
              <div className="font-extrabold">{DESIGN_INFO[d].name}</div>
              <div className="-mt-1.5 text-xs text-muted">{DESIGN_INFO[d].note}</div>
            </OptionCard>
          ))}
        </OptionGrid>
      </Card>

      <Card className={SECTION}>
        <CardHeading
          title="Colour"
          description="Light colours only, so the QR code always prints dark on white."
        />
        <OptionGrid min={120}>
          {(["match", ...STANDEE_LIGHT_THEMES] as StandeeThemeChoice[]).map((t) => {
            const sw =
              t === "match"
                ? { bg: "#F4F5F7", btn: "#11141A", card: "#FFFFFF", line: "#D5D8DF" }
                : { bg: THEMES[t].bg, btn: THEMES[t].btn, card: THEMES[t].card, line: THEMES[t].line };
            return (
              <OptionCard key={t} pressed={choices.theme === t} onClick={() => pick("theme", t)}>
                <div className="flex flex-col gap-1.5 rounded-lg border border-line p-2.5" style={{ background: sw.bg }}>
                  <div className="h-3 rounded-md" style={{ background: sw.btn }} />
                  <div className="h-2 rounded" style={{ background: sw.card, border: `1px solid ${sw.line}` }} />
                </div>
                <div className="text-sm font-extrabold">{THEME_LABEL[t]}</div>
                {t === "match" ? <div className="-mt-1.5 text-xs text-muted">Prints as {THEME_LABEL[matched]}</div> : null}
              </OptionCard>
            );
          })}
        </OptionGrid>
      </Card>

      <Card className={SECTION}>
        <CardHeading
          title="Words and size"
          description="Name, tagline and logo come from the Details tab. The icons follow the buttons switched on for this shop."
        />
        <FieldRow>
          <TextField
            label="Headline"
            value={choices.headline}
            maxLength={STANDEE_MAX_HEADLINE}
            placeholder={DESIGN_INFO[choices.design].headline}
            onChange={(e) => pick("headline", e.target.value)}
          />
          <SelectField label="Print size" value={choices.size} onChange={(e) => pick("size", e.target.value as StandeeSize)}>
            <option value="A5">A5 standee, 148 x 210 mm</option>
            <option value="A4">A4 poster, 210 x 297 mm</option>
          </SelectField>
        </FieldRow>
        <p className="m-0 text-[13px] text-muted">
          Keep headlines short, under 40 characters. The reviews line never offers rewards or asks only happy
          customers to review.
        </p>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-soft pt-3.5">
          {dirty ? <span className="text-[13px] font-bold text-muted">Unsaved standee choices</span> : null}
          <Button variant="primary" disabled={!canEdit || !dirty || saving} onClick={onSave} className="disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving" : "Save standee choices"}
          </Button>
        </div>
      </Card>
    </>
  );
}

type Check = { key: string; result: { ok: true; url: string } | { ok: false; error: string } };

// The standee in the browser, the QR check and the two downloads.
export function StandeePreviewCard({
  state,
  choices,
  qr,
  shopId,
  canDownload,
}: TabProps & {
  choices: StandeeChoices;
  qr: StandeeQr;
  shopId: string | null;
  canDownload: boolean;
}) {
  const { details, look } = state;
  const sizeLabel = SIZE_MM[choices.size].label;
  const theme = resolveStandeeTheme(choices.theme, look.theme);
  const hasCode = Boolean(shopId && qr.code && qr.art);

  // "QR checked" appears only after the server has rendered this standee and read its QR back.
  const checkKey = `${shopId}|${choices.design}|${choices.theme}|${choices.size}|${look.theme}`;
  const [check, setCheck] = useState<Check | null>(null);
  useEffect(() => {
    if (!hasCode || !shopId) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const result = await checkStandee(shopId, { design: choices.design, theme: choices.theme, headline: "", size: choices.size });
        if (live) setCheck({ key: checkKey, result });
      } catch {
        if (live) setCheck({ key: checkKey, result: { ok: false, error: "The QR check could not run." } });
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [hasCode, shopId, checkKey, choices.design, choices.theme, choices.size]);
  const status = hasCode ? (check?.key === checkKey ? check.result : null) : null;

  const query = new URLSearchParams({ design: choices.design, theme: choices.theme, headline: choices.headline, size: choices.size });
  const href = (ext: "pdf" | "png") => `/qr/admin/shops/${shopId}/standee.${ext}?${query}`;
  const blocked = !hasCode || !canDownload || status?.ok === false;
  const why = !shopId
    ? "Save the shop first, then assign a QR code."
    : !qr.code
      ? "Assign a QR code on the QR and plan tab to download the print file."
      : qr.problem
        ? qr.problem
        : !canDownload
          ? "Viewers cannot download print files."
          : null;

  return (
    <aside
      aria-label="Standee preview"
      className="box-border flex max-w-[420px] min-w-0 flex-[1_1_372px] flex-col items-center gap-3.5 rounded-[14px] border border-line bg-white p-5"
    >
      <div className="flex items-baseline justify-between gap-2 self-stretch">
        <h2 className="m-0 text-base font-extrabold">Standee preview</h2>
        <Chip>{sizeLabel}</Chip>
      </div>

      <div
        className="box-border w-[372px] max-w-full overflow-hidden rounded-md border border-line bg-white shadow-[0_14px_30px_-22px_rgba(17,20,26,0.5)]"
        style={{ aspectRatio: `${CANVAS_W} / ${canvasHeight(choices.size)}` }}
      >
        {qr.art ? (
          <StandeePreview
            design={choices.design}
            theme={theme}
            font={look.font}
            size={choices.size}
            content={standeeContent(state, choices, qr.art, details.logoUrl || null)}
          />
        ) : (
          <p className="m-0 p-6 text-center text-[13px] text-muted">{qr.problem ?? "The preview needs a QR address."}</p>
        )}
      </div>

      {hasCode && status?.ok ? (
        <div role="status" className="flex items-center gap-2 self-stretch rounded-[10px] bg-chip-live-bg px-3 py-2.5 text-[13px] font-bold text-chip-live-fg">
          <Icon d="M5 12l5 5 9-10" />
          QR checked: it opens {status.url.replace(/^https?:\/\//, "")}
        </div>
      ) : null}
      {hasCode && status && !status.ok ? (
        <div role="alert" className="flex items-center gap-2 self-stretch rounded-[10px] bg-chip-over-bg px-3 py-2.5 text-[13px] font-bold text-chip-over-fg">
          {status.error}
        </div>
      ) : null}
      {hasCode && !status ? (
        <div role="status" className="self-stretch rounded-[10px] bg-chip-none-bg px-3 py-2.5 text-[13px] font-bold text-chip-none-fg">
          Checking the QR code…
        </div>
      ) : null}
      {!hasCode && qr.art && qr.code === null ? (
        <p className="m-0 self-stretch text-center text-[12.5px] text-muted">Sample code shown until a QR code is assigned.</p>
      ) : null}

      <div className="flex flex-col gap-2.5 self-stretch">
        {blocked ? (
          <>
            <Button variant="primary" disabled className="w-full disabled:cursor-not-allowed disabled:opacity-50" icon={ICON_DOWNLOAD}>
              Download print PDF
            </Button>
            <Button disabled className="w-full disabled:cursor-not-allowed disabled:opacity-50">
              Download PNG to share on WhatsApp
            </Button>
          </>
        ) : (
          <>
            <DownloadButton variant="primary" href={href("pdf")} icon={ICON_DOWNLOAD} className="w-full">
              Download print PDF
            </DownloadButton>
            <DownloadButton href={href("png")} className="w-full">
              Download PNG to share on WhatsApp
            </DownloadButton>
          </>
        )}
      </div>
      {why ? <p className="m-0 text-center text-[12.5px] text-muted">{why}</p> : null}
      <p className="m-0 text-center text-[12.5px] text-muted">
        The print PDF has 3 mm bleed. Print one copy and scan it with two phones before ordering more.
      </p>
    </aside>
  );
}
