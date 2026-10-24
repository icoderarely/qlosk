"use client";

import { useEffect, useRef, useState } from "react";
import {
  FONT_OPTIONS,
  LAYOUT_OPTIONS,
  THEME_OPTIONS,
  themeSwatch,
} from "../admin/look-options";
import { FONT_PACKS } from "../shop-page/fonts";
import { ShopPage } from "../shop-page/shop-page";
import type { FontId, LayoutId, ThemeId } from "../shop-page/types";
import {
  DEFAULT_LOOK,
  MAX_NAME_LENGTH,
  cleanName,
  cleanTagline,
  MAX_TAGLINE_LENGTH,
  lookToQuery,
  whatsappLink,
  type PlaygroundLook,
} from "./look-url";
import { SAMPLES, SHOP_TYPE_IDS, type ShopTypeId } from "./samples";

type Suggestions = Partial<Record<ShopTypeId, { theme: ThemeId; layout: LayoutId }>>;

export type PlaygroundProps = {
  /** The look to start from. The page reads it from the URL on the server. */
  initial?: PlaygroundLook;
  /** Themes and layouts switched on in Settings. Default: all. */
  enabledThemes?: readonly ThemeId[];
  enabledLayouts?: readonly LayoutId[];
  /** Suggested look per shop type, from Settings. */
  suggestions?: Suggestions;
  /** Our WhatsApp number for the "Get this" button. Without one, WhatsApp asks who to message. */
  whatsappNumber?: string;
  /** Keep the look in the address bar. Turn off when embedded in another page. */
  syncUrl?: boolean;
  /**
   * "page" is /playground. "landing" is the section inside the landing page: same
   * controls and the same ShopPage, with the landing page's styles and no heading of
   * its own (the landing page supplies it).
   */
  variant?: "page" | "landing";
};

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";
const PICK =
  "flex min-h-11 cursor-pointer flex-col gap-1.5 rounded-xl border-2 bg-white p-2.5 text-left text-neutral-900 " +
  FOCUS;

const SCREEN_W = 390;
const SCREEN_H = 860;
const FRAME_PAD = 10;

export function PlaygroundSection({
  initial = DEFAULT_LOOK,
  enabledThemes,
  enabledLayouts,
  suggestions = {},
  whatsappNumber = "",
  syncUrl = true,
  variant = "page",
}: PlaygroundProps) {
  const landing = variant === "landing";
  const [look, setLook] = useState<PlaygroundLook>(initial);
  const themes = THEME_OPTIONS.filter((t) => !enabledThemes || enabledThemes.includes(t.id));
  const layouts = LAYOUT_OPTIONS.filter((l) => !enabledLayouts || enabledLayouts.includes(l.id));
  const sample = SAMPLES[look.type];

  const update = (patch: Partial<PlaygroundLook>) => setLook((l) => ({ ...l, ...patch }));

  function pickType(type: ShopTypeId) {
    const s = suggestions[type];
    const ok = s && themes.some((t) => t.id === s.theme) && layouts.some((l) => l.id === s.layout);
    update({ type, ...(ok ? s : {}) });
  }

  // Keep the look in the URL so a copied link reopens it. replaceState: no new
  // history entry per click and no server round trip.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (syncUrl) window.history.replaceState(null, "", `?${lookToQuery(look)}`);
  }, [look, syncUrl]);

  const labels = {
    theme: themes.find((t) => t.id === look.theme)?.name ?? look.theme,
    layout: layouts.find((l) => l.id === look.layout)?.name ?? look.layout,
    font: FONT_OPTIONS.find((f) => f.id === look.font)?.name ?? look.font,
    type: sample.label,
  };
  const name = look.name.trim() || sample.shop.name;
  const tagline = look.tagline.trim() || sample.shop.tagline || null;

  const shopTypes = SHOP_TYPE_IDS.map((id) => {
    const on = look.type === id;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => pickType(id)}
        className={
          landing
            ? `l-chip${on ? " l-chip-on" : ""}`
            : `min-h-11 cursor-pointer rounded-full border-2 px-4 font-semibold ${FOCUS} ${
                on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-900"
              }`
        }
      >
        {SAMPLES[id].label}
      </button>
    );
  });

  const fields = (
    <>
      <div className={landing ? undefined : "min-w-0 flex-[1_1_220px]"}>
        <label htmlFor="pg-name" className={landing ? "l-lab" : "mb-1.5 block text-sm font-bold text-neutral-900"}>
          Your shop name
        </label>
        <input
          id="pg-name"
          type="text"
          value={look.name}
          maxLength={MAX_NAME_LENGTH}
          placeholder={sample.shop.name}
          onChange={(e) => update({ name: cleanName(e.target.value) })}
          className={landing ? "l-in" : `box-border min-h-11 w-full rounded-[10px] border border-neutral-400 bg-white px-3 text-neutral-900 placeholder:text-neutral-600 ${FOCUS}`}
        />
      </div>
      <div className={landing ? undefined : "min-w-0 flex-[1_1_220px]"}>
        <label htmlFor="pg-tagline" className={landing ? "l-lab" : "mb-1.5 block text-sm font-bold text-neutral-900"}>
          Your tagline
        </label>
        <input
          id="pg-tagline"
          type="text"
          value={look.tagline}
          maxLength={MAX_TAGLINE_LENGTH}
          placeholder={sample.shop.tagline ?? undefined}
          onChange={(e) => update({ tagline: cleanTagline(e.target.value) })}
          className={landing ? "l-in" : `box-border min-h-11 w-full rounded-[10px] border border-neutral-400 bg-white px-3 text-neutral-900 placeholder:text-neutral-600 ${FOCUS}`}
        />
      </div>
    </>
  );

  const preview = (
    <ShopPage
      theme={look.theme}
      layout={look.layout}
      font={look.font}
      shop={{ ...sample.shop, name, tagline }}
      links={sample.links}
      offer={sample.offer}
      wifi={sample.wifi}
      banner={sample.banner}
      nameTag={landing ? "h3" : "h1"}
    />
  );

  const controlsClass = landing ? "l-try-ctl" : "flex min-w-0 flex-1 flex-col gap-5 lg:gap-4";

  return (
    <section
      aria-labelledby={landing ? undefined : "pg-title"}
      aria-label={landing ? "Try a look for your shop" : undefined}
      className={landing ? "l-try" : "mx-auto w-full max-w-[1100px] px-4 pb-24 pt-5 lg:pb-0"}
    >
      {landing ? null : (
        <h1 id="pg-title" className="m-0 text-2xl font-bold tracking-tight text-neutral-900">
          Try a look for your shop
        </h1>
      )}

      <div className={landing ? "contents" : "mt-4 flex flex-col gap-6 lg:flex-row lg:items-start"}>
        <div className={controlsClass}>
          <div className={landing ? "contents" : "flex flex-wrap items-end gap-x-6 gap-y-4"}>
          <Group title="Shop type" landing={landing}>
            <div className={landing ? "l-chips" : "flex flex-wrap gap-2"}>{shopTypes}</div>
          </Group>

          {landing ? <div className="l-fields">{fields}</div> : fields}
          </div>

          <Group title="Theme" landing={landing}>
            <Grid fiveAcross landing={landing}>
              {themes.map((t) => {
                const sw = themeSwatch(t.id);
                const on = look.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ theme: t.id })}
                    className={landing ? `l-opt${on ? " l-opt-on" : ""}` : `${PICK} ${on ? "border-neutral-900" : "border-neutral-200"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={landing ? "l-swatch" : "flex flex-col gap-1.5 rounded-lg border border-neutral-200 p-2.5"}
                      style={{ background: sw.bg }}
                    >
                      <span className="h-3 rounded-md" style={{ background: sw.btn }} />
                      <span className="h-2 rounded" style={{ background: sw.card, border: `1px solid ${sw.line}` }} />
                      <span className="h-2 rounded" style={{ background: sw.card, border: `1px solid ${sw.line}` }} />
                    </span>
                    <span className="font-bold">{t.name}{on ? <span className="sr-only"> (selected)</span> : null}</span>
                  </button>
                );
              })}
            </Grid>
          </Group>

          <Group title="Layout" landing={landing}>
            <Grid fiveAcross landing={landing}>
              {layouts.map((l) => {
                const on = look.layout === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ layout: l.id })}
                    className={landing ? `l-opt${on ? " l-opt-on" : ""}` : `${PICK} ${on ? "border-neutral-900" : "border-neutral-200"}`}
                  >
                    <svg
                      viewBox="0 0 64 44"
                      aria-hidden="true"
                      className={landing ? "l-wire" : "block h-auto w-full rounded-lg bg-neutral-100"}
                    >
                      <path d={l.d2} className={landing ? "l-wire-rest" : undefined} fill={landing ? undefined : "#C9CED8"} />
                      <path d={l.d1} className={landing ? "l-wire-main" : undefined} fill={landing ? undefined : "#16181D"} />
                    </svg>
                    <span className="font-bold">{l.name}{on ? <span className="sr-only"> (selected)</span> : null}</span>
                  </button>
                );
              })}
            </Grid>
          </Group>

          <Group title="Font" landing={landing}>
            <Grid min={150} landing={landing} threeAcross>
              {FONT_OPTIONS.map((f) => {
                const on = look.font === f.id;
                const pack = FONT_PACKS[f.id];
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ font: f.id as FontId })}
                    className={landing ? `l-opt${on ? " l-opt-on" : ""}` : `${PICK} ${on ? "border-neutral-900" : "border-neutral-200"}`}
                  >
                    <span className={pack.className} aria-hidden="true">
                      <span
                        className={landing ? "l-font-sample" : "block text-[22px] leading-[1.3]"}
                        style={{ fontFamily: pack.head, fontWeight: f.id === "rounded" ? 800 : 700 }}
                      >
                        Aa Gg
                      </span>
                    </span>
                    <span className="font-bold">{f.name}{on ? <span className="sr-only"> (selected)</span> : null}</span>
                    <span className={landing ? "l-optnote" : "-mt-1 text-xs text-neutral-700"}>{f.note}</span>
                  </button>
                );
              })}
            </Grid>
          </Group>

          <a
            href={whatsappLink(look, labels, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className={
              landing
                ? "l-btn l-btn-p l-btn-wide"
                : `mt-3 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#0B6B3A] px-6 text-lg font-extrabold text-white shadow-lg ring-4 ring-[#0B6B3A]/20 hover:bg-[#095c32] max-lg:mt-0 max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:z-10 max-lg:w-auto ${FOCUS}`
            }
          >
            Get this for my shop
            <span aria-hidden="true">→</span>
            <span className="sr-only"> (opens WhatsApp with your choices)</span>
          </a>
          {landing ? (
            <p className="l-try-note">Opens WhatsApp with your choices filled in. You can change everything later.</p>
          ) : null}
        </div>

        <div className={landing ? "l-try-view" : "order-first flex flex-none justify-center lg:order-none lg:sticky lg:top-4 lg:w-[434px]"}>
          {landing ? <LandingPhone>{preview}</LandingPhone> : <Phone>{preview}</Phone>}
        </div>
      </div>
    </section>
  );
}

function Group({ title, landing, children }: { title: string; landing: boolean; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={title}>
      {landing ? (
        <div aria-hidden="true" className="l-lab">{title}</div>
      ) : (
        <h2 className="m-0 mb-2.5 text-sm font-bold uppercase tracking-wider text-neutral-700">{title}</h2>
      )}
      {children}
    </div>
  );
}

function Grid({
  min = 130,
  fiveAcross = false,
  threeAcross = false,
  landing = false,
  children,
}: {
  min?: number;
  /** Five options on one line from the sm breakpoint up. */
  fiveAcross?: boolean;
  /** Landing page only: three equal columns (they scroll sideways on phones). */
  threeAcross?: boolean;
  landing?: boolean;
  children: React.ReactNode;
}) {
  if (landing) return <div className={`l-optgrid${threeAcross ? " l-optgrid-3" : ""}`}>{children}</div>;
  return (
    <div
      className={`grid gap-2.5 ${fiveAcross ? "grid-cols-2 sm:grid-cols-5" : ""}`}
      style={
        fiveAcross
          ? undefined
          : { gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }
      }
    >
      {children}
    </div>
  );
}

// The landing page's frame (docs/design/LandingV2.dc.html). Scaled with CSS only,
// so the server-rendered preview is already the right size and nothing shifts.
function LandingPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="l-pframe l-iphone">
      <div
        role="group"
        aria-label="Preview of the shop page"
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) e.preventDefault();
        }}
        className="l-pscreen"
      >
        <div className="l-pinner">{children}</div>
      </div>
    </div>
  );
}

// The real page at 390px wide, scaled down to fit narrow screens. Links in the
// sample point nowhere, so taps on them do nothing instead of jumping to the top.
function Phone({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const full = SCREEN_W + FRAME_PAD * 2;
    const fit = () => {
      const byWidth = el.clientWidth / full;
      // Side by side on desktop: also fit the height, leaving room for the button.
      const byHeight =
        window.innerWidth >= 1024
          ? (window.innerHeight - 70) / (SCREEN_H + FRAME_PAD * 2)
          : Infinity;
      setScale(Math.max(0.45, Math.min(1, byWidth, byHeight)));
    };
    window.addEventListener("resize", fit);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  const w = (SCREEN_W + FRAME_PAD * 2) * scale;
  const h = (SCREEN_H + FRAME_PAD * 2) * scale;
  return (
    <div ref={box} className="w-full max-w-[410px]">
      <div style={{ width: w, height: h }} className="mx-auto">
        <div
          role="group"
          aria-label="Preview of the shop page"
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest("a")) e.preventDefault();
          }}
          className="origin-top-left overflow-hidden rounded-[44px] bg-neutral-900"
          style={{
            width: SCREEN_W + FRAME_PAD * 2,
            height: SCREEN_H + FRAME_PAD * 2,
            padding: FRAME_PAD,
            transform: `scale(${scale})`,
          }}
        >
          <div
            className="overflow-y-auto overflow-x-hidden overscroll-contain rounded-[34px]"
            style={{ width: SCREEN_W, height: SCREEN_H, "--page-min-h": `${SCREEN_H}px` } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
