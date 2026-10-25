import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { Icon, LINK_ICON } from "@/components/shop-page/icons";
import { THEMES } from "@/components/shop-page/themes";
import type { FontId } from "@/components/shop-page/types";
import { BRAND_NAME } from "@/lib/brand";
import { loadLogoPng } from "@/lib/print-assets";
import { CARD_HEIGHT, CARD_WIDTH, SAFE_LEFT, SAFE_RIGHT, type ShareCardModel } from "@/services/share-card";

// The 1200 x 630 card (design: ShareCard in docs/design). Satori has no CSS
// variables, so theme tokens are resolved to plain colours here. Fonts are the
// TTFs in assets/fonts (next.config.ts ships them with the og route).

const SAFE_WIDTH = SAFE_RIGHT - SAFE_LEFT; // 880
const LOGO = 190;
const GAP = 48;
const TEXT_WIDTH = SAFE_WIDTH - LOGO - GAP;

type FontFile = { name: string; file: string; weight: 400 | 700 };
const FONT_FILES: Record<string, FontFile> = {
  dmRegular: { name: "DM Sans", file: "DMSans-Regular.ttf", weight: 400 },
  dmBold: { name: "DM Sans", file: "DMSans-Bold.ttf", weight: 700 },
  nunitoRegular: { name: "Nunito", file: "Nunito-Regular.ttf", weight: 400 },
  nunitoBold: { name: "Nunito", file: "Nunito-Bold.ttf", weight: 700 },
  fraunces: { name: "Fraunces", file: "Fraunces-Bold.ttf", weight: 700 },
};

// The shop's font pack: which family sets the name and which the rest.
const PACK: Record<FontId, { head: string; body: string; files: string[] }> = {
  editorial: { head: "Fraunces", body: "DM Sans", files: ["fraunces", "dmRegular", "dmBold"] },
  clean: { head: "DM Sans", body: "DM Sans", files: ["dmRegular", "dmBold", "fraunces"] },
  rounded: { head: "Nunito", body: "Nunito", files: ["nunitoRegular", "nunitoBold", "fraunces"] },
};

const cache = new Map<string, Promise<Buffer>>();
function fontBytes(key: string): Promise<Buffer> {
  let loaded = cache.get(key);
  if (!loaded) {
    loaded = readFile(path.join(process.cwd(), "assets", "fonts", FONT_FILES[key].file));
    loaded.catch(() => cache.delete(key));
    cache.set(key, loaded);
  }
  return loaded;
}

async function fontsFor(files: string[]) {
  const data = await Promise.all(files.map(fontBytes));
  return files.map((key, i) => ({
    name: FONT_FILES[key].name,
    data: data[i].buffer.slice(data[i].byteOffset, data[i].byteOffset + data[i].byteLength) as ArrayBuffer,
    weight: FONT_FILES[key].weight,
    style: "normal" as const,
  }));
}

/** The uploaded logo fetched here (not by the chat app), resized and embedded. Null when there is none or it cannot be read. */
async function logoDataUri(logoUrl: string | null): Promise<string | null> {
  const png = await loadLogoPng(logoUrl);
  if (!png) return null;
  try {
    const small = await sharp(png).resize({ width: LOGO * 2, height: LOGO * 2, fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${small.toString("base64")}`;
  } catch {
    return null;
  }
}

// How tall the name, tagline and area will be, so the row can start higher when
// a long name wraps. A guess: capitals run wider than lowercase.
function estimateTextHeight(m: ShareCardModel): number {
  const em = Array.from(m.name).reduce((sum, c) => sum + (c === " " ? 0.26 : c === c.toUpperCase() && c !== c.toLowerCase() ? 0.68 : 0.52), 0);
  const nameLines = Math.min(2, Math.max(1, Math.ceil((em * m.nameSize) / TEXT_WIDTH)));
  const taglineLines = m.tagline ? Math.min(2, Math.max(1, Math.ceil((Array.from(m.tagline).length * 34 * 0.52) / TEXT_WIDTH))) : 0;
  return (
    nameLines * m.nameSize * 1.05 +
    (m.tagline ? 12 + taglineLines * 34 * 1.3 : 0) +
    (m.area ? 12 + 28 * 1.3 : 0)
  );
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect width="48" height="48" rx="14" fill="#FBF1B5" />
      <rect x="9" y="9" width="26" height="26" rx="9" fill="none" stroke="#0D1F1B" strokeWidth="6" />
      <rect x="18" y="18" width="8" height="8" rx="2" fill="#0D1F1B" />
      <rect x="28.5" y="28.5" width="12" height="12" rx="3.2" fill="#0D1F1B" stroke="#FBF1B5" strokeWidth="3" />
    </svg>
  );
}

const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

function respond(image: ImageResponse, cacheControl: string): Response {
  image.headers.set("cache-control", cacheControl);
  image.headers.set("x-robots-tag", "noindex");
  return image;
}

/** A shop's card: the logo from the model if it can be read, the initials circle otherwise. */
export async function renderShopCard(m: ShareCardModel, opts: { cacheControl?: string } = {}): Promise<Response> {
  const t = THEMES[m.theme] ?? THEMES.daylight;
  const btn = m.buttonColor ?? t.btn;
  const pack = PACK[m.font] ?? PACK.clean;
  const [fonts, logo] = await Promise.all([fontsFor(pack.files), logoDataUri(m.logoUrl)]);

  const extra = Math.max(0, estimateTextHeight(m) - LOGO);
  const hasRow = m.pills.length > 0 || m.more;
  // About 140 px above the logo row, 56 below it, 74 above the credit, 80 under it.
  const top = Math.max(30, 140 - extra + (hasRow ? 0 : 56));

  const pill = { display: "flex", alignItems: "center", height: 56, borderRadius: 28, padding: "0 22px", fontSize: 26, fontWeight: 700 } as const;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: top,
          background: t.bg,
          color: t.text,
          fontFamily: pack.body,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", width: SAFE_WIDTH }}>
          {logo ? (
            <div style={{ display: "flex", width: LOGO, height: LOGO, borderRadius: 44, overflow: "hidden", background: t.card, border: `2px solid ${t.line}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- satori, not the browser */}
              <img src={logo} width={LOGO} height={LOGO} alt="" />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: LOGO,
                height: LOGO,
                borderRadius: LOGO / 2,
                background: btn,
                color: t.btntext,
                fontFamily: pack.head,
                fontSize: m.initials.length > 1 ? 76 : 92,
                fontWeight: 700,
                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
              }}
            >
              {m.initials}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", width: TEXT_WIDTH, marginLeft: GAP }}>
            <div style={{ fontFamily: pack.head, fontSize: m.nameSize, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>{m.name}</div>
            {m.tagline ? <div style={{ marginTop: 12, fontSize: 34, lineHeight: 1.25, color: t.muted }}>{m.tagline}</div> : null}
            {m.area ? (
              <div style={{ display: "flex", alignItems: "center", marginTop: 12, fontSize: 28, fontWeight: 700, color: btn }}>
                <Icon name="pin" size={28} />
                <span style={{ marginLeft: 8 }}>{m.area}</span>
              </div>
            ) : null}
          </div>
        </div>

        {hasRow ? (
          <div style={{ display: "flex", justifyContent: "center", width: SAFE_WIDTH, marginTop: 56 }}>
            {m.pills.map((p) => (
              <div key={p.type} style={{ ...pill, marginLeft: 6, marginRight: 6, background: t.chipbg, color: t.chiptext }}>
                <Icon name={LINK_ICON[p.type]} size={28} />
                <span style={{ marginLeft: 10 }}>{p.label}</span>
              </div>
            ))}
            {m.more ? <div style={{ ...pill, marginLeft: 6, marginRight: 6, background: btn, color: t.btntext }}>+ more</div> : null}
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", marginTop: 74, height: 40 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: t.muted }}>Powered by</span>
          <div style={{ display: "flex", marginLeft: 16 }}>
            <Mark size={40} />
          </div>
          <span style={{ marginLeft: 14, fontFamily: "Fraunces", fontSize: 38, fontWeight: 700, color: t.text }}>{BRAND_NAME}</span>
        </div>
      </div>
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT, fonts },
  );
  return respond(image, opts.cacheControl ?? CACHE);
}

/** The card for a slug that is unpublished, paused, archived or unknown: ours, with nothing of the shop's. */
export async function renderGenericCard(opts: { cacheControl?: string } = {}): Promise<Response> {
  const fonts = await fontsFor(["dmRegular", "fraunces"]);
  const image = new ImageResponse(
    (
      <div
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF8F2",
          color: "#0F6B5C",
          fontFamily: "DM Sans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Mark size={120} />
          <span style={{ marginLeft: 28, fontFamily: "Fraunces", fontSize: 110, fontWeight: 700 }}>{BRAND_NAME}</span>
        </div>
        <div style={{ marginTop: 36, fontSize: 40, color: "#35514b", textAlign: "center", width: SAFE_WIDTH, justifyContent: "center", display: "flex" }}>
          One QR code for your whole shop.
        </div>
      </div>
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT, fonts },
  );
  // Short cache: the slug may be published later.
  return respond(image, opts.cacheControl ?? "public, s-maxage=300, stale-while-revalidate=3600");
}
