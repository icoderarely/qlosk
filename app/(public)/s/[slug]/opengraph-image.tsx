import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";
import { getDb } from "@/lib/db";
import { loadLogoPng } from "@/lib/print-assets";
import { createPublicStore } from "@/lib/public-page-store";
import { lookupPublicPage } from "@/services/public-page";

export const alt = "Shop page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEAL = "#0F6B5C";
const CREAM = "#FBF8F2";

// The card WhatsApp and others show when a shop link is shared: the shop's logo,
// name, tagline and area, with our name small at the bottom. A shop with no
// logo gets its first letter instead.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const result = await lookupPublicPage(createPublicStore(getDb()), (await params).slug);
  const shop = result.kind === "page" ? result.props.shop : null;
  const name = shop?.name ?? BRAND_NAME;
  const logo = shop ? await loadLogoPng(shop.logoUrl ?? null) : null;
  const logoSrc = logo ? `data:image/png;base64,${Buffer.from(logo).toString("base64")}` : null;
  const sub = [shop?.tagline, shop?.area].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CREAM,
          color: TEAL,
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {logoSrc ? (
            <img src={logoSrc} width={240} height={240} alt="" style={{ objectFit: "contain", borderRadius: 40 }} />
          ) : (
            <div
              style={{
                width: 240,
                height: 240,
                borderRadius: 40,
                background: TEAL,
                color: CREAM,
                fontSize: 130,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {name.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{name}</div>
            {sub ? <div style={{ fontSize: 36, marginTop: 20, color: "#35514b" }}>{sub}</div> : null}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, color: "#35514b" }}>
          <span>Call · WhatsApp · Reviews · Maps</span>
          <span style={{ fontWeight: 700 }}>{BRAND_NAME}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
