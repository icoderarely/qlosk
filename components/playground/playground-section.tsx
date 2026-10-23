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
}: PlaygroundProps) {
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

  return (
    <section aria-labelledby="pg-title" className="mx-auto w-full max-w-[1100px] px-4 py-8">
      <h1 id="pg-title" className="m-0 text-3xl font-bold tracking-tight text-neutral-900">
        Try a look for your shop
      </h1>
      <p className="mt-2 max-w-[60ch] text-neutral-700">
        Pick a shop type, then a theme, layout and font. The phone shows your page as customers
        would see it. The sample shop is made up.
      </p>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-7">
          <Group title="Shop type">
            <div className="flex flex-wrap gap-2">
              {SHOP_TYPE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={look.type === id}
                  onClick={() => pickType(id)}
                  className={`min-h-11 cursor-pointer rounded-full border-2 px-4 font-semibold ${FOCUS} ${
                    look.type === id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-900"
                  }`}
                >
                  {SAMPLES[id].label}
                </button>
              ))}
            </div>
          </Group>

          <div>
            <label htmlFor="pg-name" className="mb-1.5 block text-sm font-bold text-neutral-900">
              Your shop name
            </label>
            <input
              id="pg-name"
              type="text"
              value={look.name}
              maxLength={MAX_NAME_LENGTH}
              placeholder={sample.shop.name}
              onChange={(e) => update({ name: cleanName(e.target.value) })}
              className={`box-border min-h-11 w-full max-w-md rounded-[10px] border border-neutral-400 bg-white px-3 text-neutral-900 placeholder:text-neutral-600 ${FOCUS}`}
            />
          </div>

          <Group title="Theme">
            <Grid>
              {themes.map((t) => {
                const sw = themeSwatch(t.id);
                const on = look.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ theme: t.id })}
                    className={`${PICK} ${on ? "border-neutral-900" : "border-neutral-200"}`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex flex-col gap-1.5 rounded-lg border border-neutral-200 p-2.5"
                      style={{ background: sw.bg }}
                    >
                      <span className="h-3 rounded-md" style={{ background: sw.btn }} />
                      <span className="h-2 rounded" style={{ background: sw.card, border: `1px solid ${sw.line}` }} />
                      <span className="h-2 rounded" style={{ background: sw.card, border: `1px solid ${sw.line}` }} />
                    </span>
                    <span className="font-bold">{t.name}{on ? <span className="sr-only"> (selected)</span> : null}</span>
                    <span className="-mt-1 text-xs text-neutral-700">{t.note}</span>
                  </button>
                );
              })}
            </Grid>
          </Group>

          <Group title="Layout">
            <Grid>
              {layouts.map((l) => {
                const on = look.layout === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ layout: l.id })}
                    className={`${PICK} ${on ? "border-neutral-900" : "border-neutral-200"}`}
                  >
                    <svg viewBox="0 0 64 44" aria-hidden="true" className="block h-auto w-full rounded-lg bg-neutral-100">
                      <path d={l.d2} fill="#C9CED8" />
                      <path d={l.d1} fill="#16181D" />
                    </svg>
                    <span className="font-bold">{l.name}{on ? <span className="sr-only"> (selected)</span> : null}</span>
                    <span className="-mt-1 text-xs text-neutral-700">{l.note}</span>
                  </button>
                );
              })}
            </Grid>
          </Group>

          <Group title="Font">
            <Grid min={150}>
              {FONT_OPTIONS.map((f) => {
                const on = look.font === f.id;
                const pack = FONT_PACKS[f.id];
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ font: f.id as FontId })}
                    className={`${PICK} ${on ? "border-neutral-900" : "border-neutral-200"}`}
                  >
                    <span className={pack.className} aria-hidden="true">
                      <span
                        className="block text-[28px] leading-[1.4]"
                        style={{ fontFamily: pack.head, fontWeight: f.id === "rounded" ? 800 : 700 }}
                      >
                        Aa Gg
                      </span>
                    </span>
                    <span className="font-bold">{f.name}{on ? <span className="sr-only"> (selected)</span> : null}</span>
                    <span className="-mt-1 text-xs text-neutral-700">{f.note}</span>
                  </button>
                );
              })}
            </Grid>
          </Group>

          <div>
            <a
              href={whatsappLink(look, labels, whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0B6B3A] px-6 font-bold text-white ${FOCUS}`}
            >
              Get this for my shop
              <span className="sr-only"> (opens WhatsApp)</span>
            </a>
            <p className="mt-2 text-sm text-neutral-700">
              Opens WhatsApp with a message that names your choices.
            </p>
          </div>
        </div>

        <div className="flex flex-none justify-center lg:sticky lg:top-6 lg:w-[434px]">
          <Phone>
            <ShopPage
              theme={look.theme}
              layout={look.layout}
              font={look.font}
              shop={{ ...sample.shop, name }}
              links={sample.links}
              offer={sample.offer}
              wifi={sample.wifi}
              banner={sample.banner}
            />
          </Phone>
        </div>
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={title}>
      <h2 className="m-0 mb-2.5 text-sm font-bold uppercase tracking-wider text-neutral-700">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ min = 130, children }: { min?: number; children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
      {children}
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
    const fit = () => setScale(Math.min(1, el.clientWidth / (SCREEN_W + FRAME_PAD * 2)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
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
            className="overflow-hidden rounded-[34px]"
            style={{ width: SCREEN_W, height: SCREEN_H, "--page-min-h": `${SCREEN_H}px` } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
