import type { MockLink } from "@/lib/mock/links";
import type {
  MockBanner,
  MockDetails,
  MockOffer,
  MockWifi,
} from "@/lib/mock/shops";
import type { FontId, LayoutId, ThemeId } from "../../shop-page/types";

export type Language = "English" | "Hindi" | "Marathi";

// Everything the editor lets you type or pick. Held in the browser only until
// the save slice (spec section 9, slice 4).
export type EditorState = {
  details: MockDetails;
  slug: string;
  links: MockLink[];
  look: { theme: ThemeId; layout: LayoutId; font: FontId };
  /** Hex of the button colour override, or null for the theme default. */
  buttonColor: string | null;
  language: Language;
  offer: MockOffer;
  banner: MockBanner;
  wifi: MockWifi;
};

export type SetEditor = <K extends keyof EditorState>(key: K, value: EditorState[K]) => void;

export type TabProps = { state: EditorState; set: SetEditor };
