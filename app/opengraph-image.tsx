import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

export const alt = `${BRAND_NAME}: one QR code for your whole shop`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colours from spec section 10 (teal on cream).
const TEAL = "#0F6B5C";
const CREAM = "#FBF8F2";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: CREAM,
          color: TEAL,
          padding: 80,
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>{BRAND_NAME}</div>
        <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, marginTop: 24, letterSpacing: -2 }}>
          One QR code for your whole shop.
        </div>
        <div style={{ fontSize: 34, marginTop: 36, color: "#35514b" }}>
          Call · WhatsApp · Google review · Wi-Fi · Maps · Offers
        </div>
      </div>
    ),
    { ...size },
  );
}
