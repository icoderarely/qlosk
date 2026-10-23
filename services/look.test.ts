import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { THEME_IDS } from "../components/shop-page/types.ts";
import { checkButtonColor, contrastReason } from "./look.ts";

// The palette offered in the editor (BUTTON_COLORS in components/admin/look-options.ts).
const PALETTE = ["#9F1D45", "#1F4FD1", "#0F6B5C", "#B4540A", "#16181D"];

describe("checkButtonColor (4.5:1 for the button text)", () => {
  it("accepts a colour with enough contrast against the theme's button text", () => {
    // Raspberry under white text, as on the Blush theme.
    const r = checkButtonColor("blush", "#9F1D45");
    assert.equal(r.ok, true);
    assert.ok(r.ratio >= 4.5);
  });

  it("blocks a colour that fails, and the answer depends on the theme", () => {
    // White text on amber is hard to read; Nightfall uses dark text on amber.
    assert.equal(checkButtonColor("daylight", "#FFB547").ok, false);
    assert.equal(checkButtonColor("nightfall", "#FFB547").ok, true);
  });

  it("blocks near-white and near-black in the wrong places", () => {
    assert.equal(checkButtonColor("daylight", "#FFFFFF").ok, false);
    assert.equal(checkButtonColor("nightfall", "#000000").ok, false);
  });

  it("gives the reason with the real ratio", () => {
    const text = contrastReason(checkButtonColor("daylight", "#FFB547"));
    assert.match(text, /^contrast is \d\.\d:1, below the 4\.5:1 needed/);
  });

  it("offers palette colours on every theme except Nightfall", () => {
    // Nightfall uses dark button text, so the palette's mid-tone colours all fall
    // short there and the override is unavailable. Adding light colours to the
    // palette would change that.
    for (const theme of THEME_IDS) {
      const usable = PALETTE.filter((hex) => checkButtonColor(theme, hex).ok);
      assert.equal(usable.length > 0, theme !== "nightfall", theme);
    }
  });
});
