// What the three designs draw, and the settings they draw it with.
import type { QrArt } from "../../services/qr-art.ts";
import type { ThemeTokens } from "../shop-page/themes.ts";
import type { FaceId, FaceMap } from "./faces.ts";
import type { StandeeItem } from "./types.ts";

export type Ctx = {
  t: ThemeTokens;
  faces: FaceMap;
  head: FaceId;
  body: FaceId;
  bodyBold: FaceId;
  /** Drawing size in units: 560 wide, the page height for the chosen size. */
  W: number;
  H: number;
  /** Bleed in units, painted past the page on every side (0 for the preview and PNG). */
  bleed: number;
};

export type Content = {
  shopName: string;
  tagline: string;
  headline: string;
  initials: string;
  /** A URL or data URI. Initials are drawn when there is none. */
  logoSrc?: string | null;
  items: StandeeItem[];
  art: QrArt;
};
