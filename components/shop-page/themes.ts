import type { CSSProperties } from "react";
import type { ThemeId } from "./types";

// Token values from docs/spec.md section 5; cover gradients from
// docs/design/ShopPage.dc.html. Themes are the only place colour lives.
export type ThemeTokens = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  line: string;
  btn: string;
  btntext: string;
  iconbg: string;
  iconfg: string;
  chipbg: string;
  chiptext: string;
  cover: string;
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  daylight: {
    bg: "#F3F6FB",
    card: "#FFFFFF",
    text: "#0E1A2B",
    muted: "#55607A",
    line: "#DCE3EF",
    btn: "#1F4FD1",
    btntext: "#FFFFFF",
    iconbg: "#E6EDFC",
    iconfg: "#1F4FD1",
    chipbg: "#E6EDFC",
    chiptext: "#1B3FAE",
    cover: "linear-gradient(135deg, #BFD0F7, #E6EDFC)",
  },
  nightfall: {
    bg: "#0F1424",
    card: "#1A2138",
    text: "#F2F4FA",
    muted: "#A3ABC2",
    line: "#2C3554",
    btn: "#FFB547",
    btntext: "#1B1303",
    iconbg: "#2A3354",
    iconfg: "#FFB547",
    chipbg: "#2A3354",
    chiptext: "#FFD08A",
    cover: "linear-gradient(135deg, #27356B, #0F1424)",
  },
  marigold: {
    bg: "#FFF1D0",
    card: "#FFFDF7",
    text: "#2A1D05",
    muted: "#6B5530",
    line: "#EBD9AE",
    btn: "#B4540A",
    btntext: "#FFFFFF",
    iconbg: "#FBE3B0",
    iconfg: "#8F4107",
    chipbg: "#FBE3B0",
    chiptext: "#7A3706",
    cover: "linear-gradient(135deg, #F6C66A, #FFF1D0)",
  },
  blush: {
    bg: "#FDEFF1",
    card: "#FFFFFF",
    text: "#3A1620",
    muted: "#7A4A55",
    line: "#F2D3D9",
    btn: "#9F1D45",
    btntext: "#FFFFFF",
    iconbg: "#FBD9E0",
    iconfg: "#8A1538",
    chipbg: "#FBD9E0",
    chiptext: "#7A1233",
    cover: "linear-gradient(135deg, #F7B8C6, #FDEFF1)",
  },
  graphite: {
    bg: "#F2F1EF",
    card: "#FFFFFF",
    text: "#16181D",
    muted: "#5E5C57",
    line: "#DEDBD6",
    btn: "#16181D",
    btntext: "#FFFFFF",
    iconbg: "#E9E7E3",
    iconfg: "#16181D",
    chipbg: "#E9E7E3",
    chiptext: "#2B2A27",
    cover: "linear-gradient(135deg, #D9D6D0, #F2F1EF)",
  },
};

// Unknown ids fall back to daylight, as the design file does.
export function themeStyle(theme: ThemeId): CSSProperties {
  const t = THEMES[theme] ?? THEMES.daylight;
  return {
    "--bg": t.bg,
    "--card": t.card,
    "--text": t.text,
    "--muted": t.muted,
    "--line": t.line,
    "--btn": t.btn,
    "--btntext": t.btntext,
    "--iconbg": t.iconbg,
    "--iconfg": t.iconfg,
    "--chipbg": t.chipbg,
    "--chiptext": t.chiptext,
    "--cover": t.cover,
  } as CSSProperties;
}
